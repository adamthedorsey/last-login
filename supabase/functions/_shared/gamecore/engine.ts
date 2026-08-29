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
  BuddyView,
  ContentItem,
  Discovery,
  DiscoveryView,
  EngineOutcome,
  GameAction,
  ItemContent,
  ItemSummary,
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

/** An item is accessible only if it and every ancestor meet their requirements. */
export function isAccessible(content: SeasonContent, state: PlayerState, item: ContentItem): boolean {
  let cur: ContentItem | undefined = item;
  let hops = 0;
  while (cur) {
    if (!meetsRequirement(state, cur.requires)) return false;
    if (!cur.parentId || ++hops > 20) break;
    cur = itemById(content, cur.parentId);
  }
  return true;
}

function isUnlocked(state: PlayerState, item: ContentItem): boolean {
  return !item.password || state.unlocked.includes(item.id);
}

// ---------------------------------------------------------------------------
// Redaction: server shapes -> client DTOs
// ---------------------------------------------------------------------------

export function toSummary(state: PlayerState, item: ContentItem): ItemSummary {
  const s: ItemSummary = {
    id: item.id,
    kind: item.kind,
    name: item.name,
  };
  if (item.icon) s.icon = item.icon;
  if (item.parentId) s.parentId = item.parentId;
  if (item.meta) s.meta = { ...item.meta };
  if (item.password && !isUnlocked(state, item)) s.locked = true;
  return s;
}

function toContent(state: PlayerState, item: ContentItem): ItemContent {
  const c: ItemContent = toSummary(state, item);
  if (item.body) c.body = item.body;
  return c;
}

function toDiscoveryView(d: Discovery): DiscoveryView {
  return { id: d.id, title: d.title, description: d.description };
}

export function toStateView(content: SeasonContent, state: PlayerState): StateView {
  return {
    seasonSlug: content.slug,
    seasonTitle: content.title,
    clockNow: content.clock.now,
    owner: content.computer.owner,
    loginUser: content.computer.loginUser,
    loginHint: content.computer.loginHint,
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

function applyOpenEffects(
  content: SeasonContent,
  state: PlayerState,
  item: ContentItem,
  events: EngineOutcome['events'],
): { newDiscoveries: DiscoveryView[]; ended: boolean } {
  const newDiscoveries: DiscoveryView[] = [];
  let ended = false;

  if (!state.opened.includes(item.id)) {
    state.opened.push(item.id);
    events.push({ type: 'open', payload: { itemId: item.id, kind: item.kind } });

    if (item.onOpen?.setFlags) {
      Object.assign(state.flags, item.onOpen.setFlags);
    }
    for (const id of item.onOpen?.discover ?? []) {
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
  }
  return { newDiscoveries, ended };
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

  const done = (result: ActionResult): EngineOutcome => ({
    state,
    changed: JSON.stringify(state) !== JSON.stringify(prevState),
    result,
    events,
  });

  switch (action.type) {
    case 'getState':
      return done({ type: 'state', view: toStateView(content, state) });

    case 'resetSeason': {
      const fresh = newPlayerState();
      events.push({ type: 'season_reset' });
      return {
        state: fresh,
        changed: true,
        result: { type: 'reset', view: toStateView(content, fresh) },
        events,
      };
    }

    case 'login': {
      if (state.loggedIn) {
        return done({ type: 'login', ok: true, view: toStateView(content, state) });
      }
      const check = checkPassword(content, state, content.computer.loginTargetId, action.password, nowMs);
      events.push({ type: 'login_attempt', payload: { ok: check.ok } });
      if (check.ok) {
        state.loggedIn = true;
        return done({ type: 'login', ok: true, view: toStateView(content, state) });
      }
      return done({ type: 'login', ok: false, lockedOut: check.lockedOut });
    }
  }

  // Everything below requires being logged in to the in-game computer.
  if (!state.loggedIn) {
    return done({ type: 'error', error: 'not_logged_in' });
  }

  switch (action.type) {
    case 'getDesktop': {
      const items = content.items
        .filter((i) => i.meta?.desktop && isAccessible(content, state, i))
        .map((i) => toSummary(state, i));
      return done({ type: 'desktop', items });
    }

    case 'listChildren': {
      const parent = itemById(content, action.parentId);
      if (!parent || !isAccessible(content, state, parent) || !isUnlocked(state, parent)) {
        return done({ type: 'children', items: [] });
      }
      const items = content.items
        .filter((i) => i.parentId === action.parentId && isAccessible(content, state, i))
        .map((i) => toSummary(state, i));
      return done({ type: 'children', items });
    }

    case 'open': {
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
        item: toContent(state, item),
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
        page: toContent(state, page),
        newDiscoveries: newDiscoveries.length ? newDiscoveries : undefined,
        ended: ended || undefined,
      });
    }

    case 'search': {
      events.push({ type: 'search', payload: { query: action.query.slice(0, 200) } });
      return done({ type: 'search', results: searchPages(content, state, action.query) });
    }

    case 'getBuddies': {
      const buddies: BuddyView[] = content.buddies
        .filter((b) => meetsRequirement(state, b.requires))
        .map((b: Buddy) => ({
          screenname: b.screenname,
          alias: b.alias,
          group: b.group,
          status: b.status,
          awayMessage: b.awayMessage,
          conversationId: b.conversationId,
        }));
      return done({ type: 'buddies', buddies });
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
