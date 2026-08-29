/**
 * Authoritative game engine. Pure and deterministic: (content, state, action, now)
 * in, (new state, redacted result, events) out. Runs inside the Supabase Edge
 * Function in production and inside the dev-only in-browser adapter locally.
 *
 * Nothing returned from here may include requirements, passwords, onOpen
 * effects or content the player is not entitled to.
 */

import type {
  ActionResult,
  Buddy,
  BuddyStatus,
  BuddyView,
  ChatConversation,
  ChatView,
  ContentItem,
  Discovery,
  DiscoveryView,
  EngineOutcome,
  GameAction,
  ImMessage,
  ItemContent,
  ItemSummary,
  PlayerDocument,
  PlayerFolder,
  PlayerState,
  Requirement,
  SeasonContent,
  SearchResult,
  StateView,
} from './types.ts';
import { newPlayerState } from './types.ts';

// ---------------------------------------------------------------------------
// Requirement evaluation
// ---------------------------------------------------------------------------

export function meetsRequirement(state: PlayerState, req: Requirement | undefined): boolean {
  if (!req) return true;
  if ('all' in req) return req.all.every((r) => meetsRequirement(state, r));
  if ('any' in req) return req.any.some((r) => meetsRequirement(state, r));
  if ('discovery' in req) return state.discoveries.includes(req.discovery);
  if ('opened' in req) return state.opened.includes(req.opened);
  if ('unlocked' in req) return state.unlocked.includes(req.unlocked);
  if ('flag' in req) return state.flags[req.flag] === true;
  return false;
}

// ---------------------------------------------------------------------------
// Content indexing helpers
// ---------------------------------------------------------------------------

export function itemById(content: SeasonContent, id: string): ContentItem | undefined {
  return content.items.find((i) => i.id === id);
}

function discoveryById(content: SeasonContent, id: string): Discovery | undefined {
  return content.discoveries.find((d) => d.id === id);
}

/** An item is accessible only if it and every ancestor meet their
 * requirements — and, for items that arrive over the wire, only once a
 * delivery sweep has actually delivered them. */
export function isAccessible(content: SeasonContent, state: PlayerState, item: ContentItem): boolean {
  let cur: ContentItem | undefined = item;
  let hops = 0;
  while (cur) {
    if (!meetsRequirement(state, cur.requires)) return false;
    if (cur.arrivesOnline && !(state.delivered ?? []).includes(cur.id)) return false;
    if (!cur.parentId || ++hops > 20) break;
    cur = itemById(content, cur.parentId);
  }
  return true;
}

/**
 * The mail truck: while online, any arrivesOnline item whose requirements
 * are met gets delivered (permanently — the machine has it on disk now).
 * Returns how many arrived in this sweep.
 */
function deliverPending(content: SeasonContent, state: PlayerState): number {
  const delivered = (state.delivered ??= []);
  let n = 0;
  for (const item of content.items) {
    if (!item.arrivesOnline || delivered.includes(item.id)) continue;
    if (!meetsRequirement(state, item.requires)) continue;
    delivered.push(item.id);
    n += 1;
  }
  return n;
}

function isUnlocked(state: PlayerState, item: ContentItem): boolean {
  return !item.password || state.unlocked.includes(item.id);
}

// ---------------------------------------------------------------------------
// Redaction: server shapes -> client DTOs
// ---------------------------------------------------------------------------

export function toSummary(content: SeasonContent, state: PlayerState, item: ContentItem): ItemSummary {
  const s: ItemSummary = {
    id: item.id,
    kind: item.kind,
    name: item.name,
  };
  if (item.icon) s.icon = item.icon;
  if (item.parentId) s.parentId = item.parentId;
  if (item.meta) s.meta = { ...item.meta };
  if (item.password && !isUnlocked(state, item)) s.locked = true;
  // Fullness is presentation, but VISIBLE fullness — only accessible
  // children count, so a gated file never bulges the can early.
  if (item.fullWhenHasChildren && s.icon) {
    const target = item.fullWhenHasChildren;
    const hasAny = content.items.some(
      (c) => c.parentId === target && isAccessible(content, state, c),
    );
    if (hasAny) s.icon = `${s.icon}-full`;
  }
  return s;
}

function toContent(content: SeasonContent, state: PlayerState, item: ContentItem): ItemContent {
  const c: ItemContent = toSummary(content, state, item);
  if (item.body) c.body = item.body;
  return c;
}

function toDiscoveryView(d: Discovery): DiscoveryView {
  return { id: d.id, title: d.title, description: d.description };
}

/**
 * The owner's password hint is earned, not given: it appears only after this
 * many failed login attempts (and then stays revealed, across lockouts and
 * reloads, via a server-side flag).
 */
const HINT_AFTER_ATTEMPTS = 3;
const HINT_REVEALED_FLAG = 'login-hint-revealed';

export function toStateView(
  content: SeasonContent,
  state: PlayerState,
  /** Real-time clock for lock countdowns; omit and the view carries none. */
  nowMs?: number,
): StateView {
  const lockedUntil = state.lockedUntil[content.computer.loginTargetId] ?? 0;
  const lockSeconds =
    nowMs !== undefined && lockedUntil > nowMs ? Math.ceil((lockedUntil - nowMs) / 1000) : undefined;
  return {
    seasonSlug: content.slug,
    seasonTitle: content.title,
    clockNow: content.clock.now,
    owner: content.computer.owner,
    loginUser: content.computer.loginUser,
    loginHint: state.flags[HINT_REVEALED_FLAG] ? content.computer.loginHint : undefined,
    loginLockSeconds: lockSeconds,
    online: state.online === true,
    linePickup: state.flags['line-pickup-done'] === true,
    onlineSeconds:
      state.online && state.onlineSince && nowMs !== undefined
        ? Math.max(0, Math.floor((nowMs - state.onlineSince) / 1000))
        : undefined,
    saverText: content.computer.saverText,
    imScreenname: content.computer.imScreenname,
    bootWarning: content.computer.bootWarning,
    dosVolume: content.computer.dosVolume,
    wallpaper: content.wallpaper,
    homeUrl: content.homeUrl,
    loggedIn: state.loggedIn,
    ended: state.ended,
    discoveries: state.discoveries
      .map((id) => discoveryById(content, id))
      .filter((d): d is Discovery => !!d)
      .map(toDiscoveryView),
    opened: [...state.opened],
  };
}

// ---------------------------------------------------------------------------
// Passwords with brute-force lockout
// ---------------------------------------------------------------------------

interface PasswordCheck {
  ok: boolean;
  lockedOut: boolean;
  remainingAttempts: number;
}

function checkPassword(
  content: SeasonContent,
  state: PlayerState,
  targetId: string,
  attempt: string,
  nowMs: number,
): PasswordCheck {
  const lockedUntil = state.lockedUntil[targetId] ?? 0;
  if (nowMs < lockedUntil) {
    return { ok: false, lockedOut: true, remainingAttempts: 0 };
  }

  const standalone = content.passwords[targetId];
  const item = itemById(content, targetId);
  const expected = standalone?.password ?? item?.password;
  if (expected === undefined) return { ok: false, lockedOut: false, remainingAttempts: 0 };

  const normalized = attempt.trim().toLowerCase();
  if (normalized === expected.toLowerCase()) {
    state.passwordAttempts[targetId] = 0;
    delete state.lockedUntil[targetId];
    if (!state.unlocked.includes(targetId)) state.unlocked.push(targetId);
    return { ok: true, lockedOut: false, remainingAttempts: content.maxPasswordAttempts };
  }

  const attempts = (state.passwordAttempts[targetId] ?? 0) + 1;
  state.passwordAttempts[targetId] = attempts;
  const remaining = Math.max(0, content.maxPasswordAttempts - attempts);
  if (remaining === 0) {
    state.lockedUntil[targetId] = nowMs + content.lockoutSeconds * 1000;
    state.passwordAttempts[targetId] = 0;
    return { ok: false, lockedOut: true, remainingAttempts: 0 };
  }
  return { ok: false, lockedOut: false, remainingAttempts: remaining };
}

// ---------------------------------------------------------------------------
// Open effects (discoveries, flags, demo end)
// ---------------------------------------------------------------------------

function grantDiscoveries(
  content: SeasonContent,
  state: PlayerState,
  ids: string[],
  events: EngineOutcome['events'],
): { newDiscoveries: DiscoveryView[]; ended: boolean } {
  const newDiscoveries: DiscoveryView[] = [];
  let ended = false;
  for (const id of ids) {
    if (state.discoveries.includes(id)) continue;
    const d = discoveryById(content, id);
    if (!d) continue;
    state.discoveries.push(id);
    newDiscoveries.push(toDiscoveryView(d));
    events.push({ type: 'discovery', payload: { discoveryId: id } });
    if (d.endsDemo && !state.ended) {
      state.ended = true;
      ended = true;
      events.push({ type: 'season_ended' });
    }
  }
  return { newDiscoveries, ended };
}

function applyOpenEffects(
  content: SeasonContent,
  state: PlayerState,
  item: ContentItem,
  events: EngineOutcome['events'],
): { newDiscoveries: DiscoveryView[]; ended: boolean } {
  if (state.opened.includes(item.id)) return { newDiscoveries: [], ended: false };
  state.opened.push(item.id);
  events.push({ type: 'open', payload: { itemId: item.id, kind: item.kind } });
  if (item.onOpen?.setFlags) {
    Object.assign(state.flags, item.onOpen.setFlags);
  }
  return grantDiscoveries(content, state, item.onOpen?.discover ?? [], events);
}

// ---------------------------------------------------------------------------
// Buddies & live conversations
// ---------------------------------------------------------------------------

/** Resolve a buddy's presence: base status, then overrides (last match wins). */
export function resolvePresence(
  state: PlayerState,
  buddy: Buddy,
): { status: BuddyStatus; awayMessage?: string } {
  let status = buddy.status;
  let awayMessage = buddy.awayMessage;
  for (const o of buddy.overrides ?? []) {
    if (meetsRequirement(state, o.requires)) {
      status = o.status;
      awayMessage = o.awayMessage;
    }
  }
  return { status, awayMessage };
}

function conversationFor(
  content: SeasonContent,
  state: PlayerState,
  screenname: string,
): { convo: ChatConversation; buddy: Buddy } | null {
  if (!state.online) return null; // live chat needs the dial-up connection
  const convo = (content.conversations ?? []).find((c) => c.screenname === screenname);
  if (!convo || !meetsRequirement(state, convo.requires)) return null;
  const buddy = content.buddies.find((b) => b.screenname === screenname);
  if (!buddy || !meetsRequirement(state, buddy.requires)) return null;
  if (resolvePresence(state, buddy).status === 'offline') return null;
  return { convo, buddy };
}

function usedPrompts(state: PlayerState, screenname: string): string[] {
  return state.chats?.[screenname] ?? [];
}

function availablePrompts(state: PlayerState, convo: ChatConversation) {
  const used = usedPrompts(state, convo.screenname);
  return convo.prompts.filter((p) => !used.includes(p.id) && meetsRequirement(state, p.requires));
}

/** Deterministic in-world timestamps for the live transcript (frozen clock + n minutes). */
function chatClock(content: SeasonContent, minutesAfter: number): string {
  const base = new Date(`${content.clock.now}Z`);
  const t = new Date(base.getTime() + minutesAfter * 60_000);
  const h = t.getUTCHours();
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(t.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Rebuild the whole transcript from content + the ordered list of said prompts. */
function toChatView(
  content: SeasonContent,
  state: PlayerState,
  convo: ChatConversation,
  buddy: Buddy,
): ChatView {
  const self = content.computer.imScreenname ?? 'me';
  const messages: ImMessage[] = [];
  let minute = 0;
  for (const text of convo.opener) {
    messages.push({ from: convo.screenname, at: chatClock(content, minute), text });
  }
  let signedOff = false;
  for (const id of usedPrompts(state, convo.screenname)) {
    const p = convo.prompts.find((x) => x.id === id);
    if (!p) continue;
    minute += 1;
    messages.push({ from: self, at: chatClock(content, minute), text: p.text });
    for (const reply of p.replies) {
      messages.push({ from: convo.screenname, at: chatClock(content, minute), text: reply });
    }
    if (p.signOff) signedOff = true;
  }
  return {
    screenname: convo.screenname,
    alias: buddy.alias,
    messages,
    prompts: signedOff
      ? []
      : availablePrompts(state, convo).map((p) => ({ id: p.id, text: p.text })),
    signedOff: signedOff || undefined,
  };
}

// ---------------------------------------------------------------------------
// Player documents (the player's own Notepad files, saved to the desktop)
// ---------------------------------------------------------------------------

const MAX_PLAYER_DOCS = 24;
const MAX_PLAYER_FOLDERS = 12;
const MAX_DOC_TEXT = 20000;

function stripName(raw: string, fallback: string): string {
  const name = raw.replace(/[\p{Cc}\\/:*?"<>|]/gu, '').trim().slice(0, 40);
  return name || fallback;
}

function sanitizeDocName(raw: string): string {
  let name = stripName(raw, 'untitled');
  if (!name.includes('.')) name += '.txt';
  return name;
}

function docSummary(doc: PlayerDocument, index: number): ItemSummary {
  return {
    id: doc.id,
    kind: 'document',
    name: doc.name,
    icon: 'doc',
    editable: true,
    meta: {
      createdAt: doc.createdAt,
      modifiedAt: doc.modifiedAt,
      sizeKb: Math.max(1, Math.round(doc.text.length / 1024)),
      // Player files stack in their own desktop column(s), right of the story icons.
      desktop: { x: 312 + Math.floor(index / 5) * 96, y: 120 + (index % 5) * 96 },
    },
  };
}

function playerDoc(state: PlayerState, id: string): PlayerDocument | undefined {
  return (state.documents ?? []).find((d) => d.id === id);
}

function playerFolder(state: PlayerState, id: string): PlayerFolder | undefined {
  return (state.folders ?? []).find((f) => f.id === id);
}

function folderSummary(folder: PlayerFolder, index: number): ItemSummary {
  return {
    id: folder.id,
    kind: 'folder',
    name: folder.name,
    icon: 'folder',
    editable: true,
    meta: {
      createdAt: folder.createdAt,
      path: `Desktop\\${folder.name}`,
      desktop: { x: 408 + Math.floor(index / 5) * 96, y: 120 + (index % 5) * 96 },
    },
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function searchPages(content: SeasonContent, state: PlayerState, query: string): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const item of content.items) {
    if (item.kind !== 'webpage' || !item.meta?.url) continue;
    if (!isAccessible(content, state, item)) continue;

    const textParts: string[] = [item.name, item.meta.siteTitle ?? '', item.searchText ?? ''];
    for (const b of item.body?.blocks ?? []) {
      if ('text' in b) textParts.push(b.text);
      if (b.t === 'list') textParts.push(b.items.join(' '));
    }
    const haystack = textParts.join(' ').toLowerCase();
    if (!terms.some((t) => haystack.includes(t))) continue;

    const firstPara = item.body?.blocks?.find((b) => b.t === 'p');
    const snippetSource = (firstPara && 'text' in firstPara ? firstPara.text : item.name) ?? item.name;
    results.push({
      title: item.meta.siteTitle ?? item.name,
      url: item.meta.url,
      snippet: snippetSource.slice(0, 140),
    });
  }
  return results.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

function clone(state: PlayerState): PlayerState {
  return JSON.parse(JSON.stringify(state)) as PlayerState;
}

export function handleAction(
  content: SeasonContent,
  prevState: PlayerState,
  action: GameAction,
  nowMs: number,
): EngineOutcome {
  const state = clone(prevState);
  const events: EngineOutcome['events'] = [];
  let pickupNotice = false;

  const done = (result: ActionResult): EngineOutcome => ({
    state,
    changed: JSON.stringify(state) !== JSON.stringify(prevState),
    result: pickupNotice ? { ...result, linePickup: true } : result,
    events,
  });

  switch (action.type) {
    case 'getState':
      return done({ type: 'state', view: toStateView(content, state, nowMs) });

    case 'resetSeason': {
      const fresh = newPlayerState();
      events.push({ type: 'season_reset' });
      return {
        state: fresh,
        changed: true,
        result: { type: 'reset', view: toStateView(content, fresh, nowMs) },
        events,
      };
    }

    case 'login': {
      if (state.loggedIn) {
        return done({ type: 'login', ok: true, view: toStateView(content, state, nowMs) });
      }
      const targetId = content.computer.loginTargetId;
      const check = checkPassword(content, state, targetId, action.password, nowMs);
      events.push({ type: 'login_attempt', payload: { ok: check.ok } });
      if (check.ok) {
        state.loggedIn = true;
        return done({ type: 'login', ok: true, view: toStateView(content, state, nowMs) });
      }
      // Enough failures earn the owner's own hint — permanently.
      const attempts = state.passwordAttempts[targetId] ?? 0;
      if (check.lockedOut || attempts >= HINT_AFTER_ATTEMPTS) {
        state.flags[HINT_REVEALED_FLAG] = true;
      }
      const lockedUntil = state.lockedUntil[targetId] ?? 0;
      return done({
        type: 'login',
        ok: false,
        lockedOut: check.lockedOut,
        retryAfterSeconds: check.lockedOut
          ? Math.max(1, Math.ceil((lockedUntil - nowMs) / 1000))
          : undefined,
        hint: state.flags[HINT_REVEALED_FLAG] ? content.computer.loginHint : undefined,
      });
    }

    case 'logout': {
      if (state.loggedIn) {
        state.loggedIn = false;
        events.push({ type: 'logout' });
      }
      return done({ type: 'state', view: toStateView(content, state, nowMs) });
    }
  }

  // Everything below requires being logged in to the in-game computer.
  if (!state.loggedIn) {
    return done({ type: 'error', error: 'not_logged_in' });
  }

  // The house has one phone line. Once the season's condition is met, the
  // next action taken while the line is up gets it yanked — somebody in
  // the house picked up the extension. Once per season.
  if (
    state.online &&
    content.linePickup &&
    !state.flags['line-pickup-done'] &&
    meetsRequirement(state, content.linePickup.requires) &&
    action.type !== 'connect'
  ) {
    state.flags['line-pickup-done'] = true;
    state.online = false;
    delete state.onlineSince;
    pickupNotice = true;
    events.push({ type: 'net_line_pickup' });
  }

  // While the line is up, the outside world can reach the machine: any
  // newly-eligible wire content arrives before the action is handled.
  const arrived = state.online ? deliverPending(content, state) : 0;

  switch (action.type) {
    case 'connect': {
      if (!state.online) {
        state.online = true;
        state.onlineSince = nowMs;
        events.push({ type: 'net_connect' });
      }
      const newMail = deliverPending(content, state);
      return done({ type: 'net', online: true, newMail });
    }

    case 'disconnect': {
      if (state.online) {
        state.online = false;
        delete state.onlineSince;
        events.push({ type: 'net_disconnect' });
      }
      return done({ type: 'net', online: false });
    }

    case 'checkMail': {
      if (!state.online) return done({ type: 'net', online: false });
      return done({ type: 'net', online: true, newMail: arrived });
    }

    case 'getDesktop': {
      const items = content.items
        .filter((i) => i.meta?.desktop && isAccessible(content, state, i))
        .map((i) => toSummary(content, state, i));
      (state.folders ?? []).forEach((f, i) => items.push(folderSummary(f, i)));
      (state.documents ?? [])
        .filter((d) => !d.folderId)
        .forEach((d, i) => items.push(docSummary(d, i)));
      return done({ type: 'desktop', items });
    }

    case 'listChildren': {
      // Player folders list their own documents.
      if (playerFolder(state, action.parentId)) {
        const items = (state.documents ?? [])
          .filter((d) => d.folderId === action.parentId)
          .map((d, i) => docSummary(d, i));
        return done({ type: 'children', items });
      }
      const parent = itemById(content, action.parentId);
      if (!parent || !isAccessible(content, state, parent) || !isUnlocked(state, parent)) {
        return done({ type: 'children', items: [] });
      }
      const items = content.items
        .filter((i) => i.parentId === action.parentId && isAccessible(content, state, i))
        .map((i) => toSummary(content, state, i));
      return done({ type: 'children', items });
    }

    case 'open': {
      // Player-authored documents open with full (editable) content.
      const doc = playerDoc(state, action.itemId);
      if (doc) {
        const idx = (state.documents ?? []).indexOf(doc);
        return done({
          type: 'open',
          ok: true,
          item: { ...docSummary(doc, idx), body: { text: doc.text } },
        });
      }
      const pf = playerFolder(state, action.itemId);
      if (pf) {
        const idx = (state.folders ?? []).indexOf(pf);
        return done({ type: 'open', ok: true, item: folderSummary(pf, idx) });
      }
      const item = itemById(content, action.itemId);
      if (!item || !isAccessible(content, state, item)) {
        return done({ type: 'open', ok: false, error: 'not_found' });
      }
      if (!isUnlocked(state, item)) {
        return done({ type: 'open', ok: false, lockedHint: item.passwordHint, error: 'locked' });
      }
      const { newDiscoveries, ended } = applyOpenEffects(content, state, item, events);
      return done({
        type: 'open',
        ok: true,
        item: toContent(content, state, item),
        newDiscoveries: newDiscoveries.length ? newDiscoveries : undefined,
        ended: ended || undefined,
      });
    }

    case 'attemptPassword': {
      const item = itemById(content, action.targetId);
      const standalone = content.passwords[action.targetId];
      // A guessable target must actually exist and be reachable.
      if (!standalone && (!item || !isAccessible(content, state, item))) {
        return done({ type: 'password', ok: false, remainingAttempts: 0 });
      }
      const check = checkPassword(content, state, action.targetId, action.password, nowMs);
      events.push({
        type: 'password_attempt',
        payload: { targetId: action.targetId, ok: check.ok },
      });
      return done({
        type: 'password',
        ok: check.ok,
        lockedOut: check.lockedOut || undefined,
        remainingAttempts: check.remainingAttempts,
      });
    }

    case 'visit': {
      if (!state.online) {
        return done({ type: 'visit', ok: false, offline: true });
      }
      const url = normalizeUrl(action.url);
      const page = content.items.find(
        (i) => i.kind === 'webpage' && i.meta?.url && normalizeUrl(i.meta.url) === url,
      );
      if (!page || !isAccessible(content, state, page)) {
        return done({ type: 'visit', ok: false });
      }
      const { newDiscoveries, ended } = applyOpenEffects(content, state, page, events);
      return done({
        type: 'visit',
        ok: true,
        page: toContent(content, state, page),
        newDiscoveries: newDiscoveries.length ? newDiscoveries : undefined,
        ended: ended || undefined,
      });
    }

    case 'search': {
      if (!state.online) {
        return done({ type: 'search', results: [], offline: true });
      }
      events.push({ type: 'search', payload: { query: action.query.slice(0, 200) } });
      return done({ type: 'search', results: searchPages(content, state, action.query) });
    }

    case 'saveDocument': {
      const docs = (state.documents ??= []);
      const name = sanitizeDocName(action.name);
      const text = action.text.slice(0, MAX_DOC_TEXT);
      const nowDate = content.clock.now.slice(0, 10);

      if (action.docId) {
        const doc = playerDoc(state, action.docId);
        if (!doc) return done({ type: 'document', ok: false, error: 'not_found' });
        doc.name = name;
        doc.text = text;
        doc.modifiedAt = nowDate;
        events.push({ type: 'save_document', payload: { docId: doc.id } });
        return done({ type: 'document', ok: true, item: docSummary(doc, docs.indexOf(doc)) });
      }

      if (docs.length >= MAX_PLAYER_DOCS) {
        return done({ type: 'document', ok: false, error: 'too_many' });
      }
      const seq = (state.docSeq ?? 0) + 1;
      state.docSeq = seq;
      const doc: PlayerDocument = {
        id: `playerdoc.${seq}`,
        name,
        text,
        createdAt: nowDate,
        modifiedAt: nowDate,
      };
      docs.push(doc);
      events.push({ type: 'save_document', payload: { docId: doc.id } });
      return done({ type: 'document', ok: true, item: docSummary(doc, docs.length - 1) });
    }

    case 'createFolder': {
      const folders = (state.folders ??= []);
      if (folders.length >= MAX_PLAYER_FOLDERS) {
        return done({ type: 'document', ok: false, error: 'too_many' });
      }
      const seq = (state.folderSeq ?? 0) + 1;
      state.folderSeq = seq;
      const folder: PlayerFolder = {
        id: `playerfolder.${seq}`,
        name: stripName(action.name, 'New Folder'),
        createdAt: content.clock.now.slice(0, 10),
      };
      folders.push(folder);
      events.push({ type: 'create_folder', payload: { folderId: folder.id } });
      return done({ type: 'document', ok: true, item: folderSummary(folder, folders.length - 1) });
    }

    case 'moveDocument': {
      const doc = playerDoc(state, action.docId);
      if (!doc) return done({ type: 'document', ok: false, error: 'not_found' });
      if (action.folderId && !playerFolder(state, action.folderId)) {
        return done({ type: 'document', ok: false, error: 'not_found' });
      }
      doc.folderId = action.folderId;
      events.push({ type: 'move_document', payload: { docId: doc.id, folderId: action.folderId ?? null } });
      return done({
        type: 'document',
        ok: true,
        item: docSummary(doc, (state.documents ?? []).indexOf(doc)),
      });
    }

    case 'renameItem': {
      // Only the player's own files/folders can be renamed — the story's
      // files are preserved evidence.
      const doc = playerDoc(state, action.itemId);
      if (doc) {
        doc.name = sanitizeDocName(action.name);
        doc.modifiedAt = content.clock.now.slice(0, 10);
        events.push({ type: 'rename_item', payload: { itemId: doc.id } });
        return done({
          type: 'document',
          ok: true,
          item: docSummary(doc, (state.documents ?? []).indexOf(doc)),
        });
      }
      const pf = playerFolder(state, action.itemId);
      if (pf) {
        pf.name = stripName(action.name, pf.name);
        events.push({ type: 'rename_item', payload: { itemId: pf.id } });
        return done({
          type: 'document',
          ok: true,
          item: folderSummary(pf, (state.folders ?? []).indexOf(pf)),
        });
      }
      return done({ type: 'document', ok: false, error: 'not_found' });
    }

    case 'getBuddies': {
      const buddies: BuddyView[] = content.buddies
        .filter((b) => meetsRequirement(state, b.requires))
        .map((b: Buddy) => {
          // Offline, the roster still lists everyone — but nobody is
          // reachable and no live presence is known.
          const presence = state.online
            ? resolvePresence(state, b)
            : { status: 'offline' as const, awayMessage: undefined };
          return {
            screenname: b.screenname,
            alias: b.alias,
            group: b.group,
            status: presence.status,
            awayMessage: presence.awayMessage,
            conversationId: b.conversationId,
            canChat: conversationFor(content, state, b.screenname) ? true : undefined,
          };
        });
      return done({ type: 'buddies', buddies });
    }

    case 'getConversation': {
      const found = conversationFor(content, state, action.screenname);
      if (!found) return done({ type: 'chat', ok: false, error: 'not_available' });
      return done({ type: 'chat', ok: true, chat: toChatView(content, state, found.convo, found.buddy) });
    }

    case 'say': {
      const found = conversationFor(content, state, action.screenname);
      if (!found) return done({ type: 'chat', ok: false, error: 'not_available' });
      const { convo, buddy } = found;
      const prompt = availablePrompts(state, convo).find((p) => p.id === action.promptId);
      if (!prompt) return done({ type: 'chat', ok: false, error: 'not_available' });

      const chats = (state.chats ??= {});
      (chats[convo.screenname] ??= []).push(prompt.id);
      events.push({ type: 'chat', payload: { screenname: convo.screenname, promptId: prompt.id } });
      if (prompt.setFlags) Object.assign(state.flags, prompt.setFlags);
      const { newDiscoveries, ended } = grantDiscoveries(content, state, prompt.discover ?? [], events);

      return done({
        type: 'chat',
        ok: true,
        chat: toChatView(content, state, convo, buddy),
        newDiscoveries: newDiscoveries.length ? newDiscoveries : undefined,
        ended: ended || undefined,
      });
    }

    default:
      return done({ type: 'error', error: 'unknown_action' });
  }
}

export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}
