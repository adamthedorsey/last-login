/**
 * Season content validator — fails the build when the clue graph is broken.
 * Run: npm run validate   (also runs ahead of gen:seed and verify)
 *
 * ERRORS (exit 1): dangling references, ungrantable discoveries, items or
 * discoveries unreachable by any player, an unreachable finale.
 * WARNINGS: single-path discoveries (two-path rule), desktop cell collisions,
 * password-locked items (listed so they're reviewed as puzzles).
 */
import { SEASON1 } from '../supabase/functions/_shared/gamecore/season1.ts';
import { isAccessible, meetsRequirement, resolvePresence } from '../supabase/functions/_shared/gamecore/engine.ts';
import {
  newPlayerState,
  type Requirement,
  type SeasonContent,
} from '../supabase/functions/_shared/gamecore/types.ts';

const errors: string[] = [];
const warnings: string[] = [];

function leaves(req: Requirement): Array<Record<string, string>> {
  if ('all' in req) return req.all.flatMap(leaves);
  if ('any' in req) return req.any.flatMap(leaves);
  return [req as Record<string, string>];
}

function validate(content: SeasonContent): void {
  const itemIds = new Set(content.items.map((i) => i.id));
  const discoveryIds = new Set(content.discoveries.map((d) => d.id));
  const passwordTargets = new Set([
    ...Object.keys(content.passwords),
    ...content.items.filter((i) => i.password).map((i) => i.id),
  ]);

  // --- Uniqueness ---
  const seen = new Set<string>();
  for (const item of content.items) {
    if (seen.has(item.id)) errors.push(`duplicate item id: ${item.id}`);
    seen.add(item.id);
  }
  const urls = new Map<string, string>();
  for (const item of content.items) {
    if (item.kind === 'webpage' && item.meta?.url) {
      const prev = urls.get(item.meta.url);
      if (prev) errors.push(`duplicate url ${item.meta.url}: ${prev} and ${item.id}`);
      urls.set(item.meta.url, item.id);
    }
  }

  // --- Reference integrity ---
  const checkReq = (owner: string, req: Requirement | undefined) => {
    if (!req) return;
    for (const leaf of leaves(req)) {
      if ('discovery' in leaf && !discoveryIds.has(leaf.discovery))
        errors.push(`${owner}: requires unknown discovery "${leaf.discovery}"`);
      if ('opened' in leaf && !itemIds.has(leaf.opened))
        errors.push(`${owner}: requires opening unknown item "${leaf.opened}"`);
      if ('unlocked' in leaf && !passwordTargets.has(leaf.unlocked))
        errors.push(`${owner}: requires unknown password target "${leaf.unlocked}"`);
    }
  };
  for (const item of content.items) {
    checkReq(item.id, item.requires);
    if (item.parentId && !itemIds.has(item.parentId))
      errors.push(`${item.id}: unknown parentId "${item.parentId}"`);
    if (item.fullWhenHasChildren && !itemIds.has(item.fullWhenHasChildren))
      errors.push(`${item.id}: fullWhenHasChildren references unknown item "${item.fullWhenHasChildren}"`);
    for (const d of item.onOpen?.discover ?? [])
      if (!discoveryIds.has(d)) errors.push(`${item.id}: grants unknown discovery "${d}"`);
  }
  for (const buddy of content.buddies) {
    checkReq(`buddy ${buddy.screenname}`, buddy.requires);
    for (const o of buddy.overrides ?? []) checkReq(`buddy ${buddy.screenname} override`, o.requires);
    if (buddy.conversationId && !itemIds.has(buddy.conversationId))
      errors.push(`buddy ${buddy.screenname}: unknown conversationId "${buddy.conversationId}"`);
  }
  if (!passwordTargets.has(content.computer.loginTargetId))
    errors.push(`computer.loginTargetId "${content.computer.loginTargetId}" has no password`);
  if (content.linePickup) checkReq('linePickup', content.linePickup.requires);

  // Phone Dialer numbers: digits only, unique, message outcomes carry lines.
  const seenPhones = new Set<string>();
  for (const p of content.phones ?? []) {
    const who = `phone ${p.number}`;
    checkReq(who, p.requires);
    if (!/^\d{3,20}$/.test(p.number)) errors.push(`${who}: number must be 3-20 digits`);
    if (seenPhones.has(p.number)) errors.push(`${who}: duplicate number`);
    seenPhones.add(p.number);
    if (p.outcome === 'message' && !(p.message && p.message.length > 0)) {
      errors.push(`${who}: outcome 'message' needs message lines`);
    }
  }

  // --- Conversations: references, prompt uniqueness, flag integrity ---
  const buddyNames = new Set(content.buddies.map((b) => b.screenname));
  const settableFlags = new Set<string>();
  for (const item of content.items)
    for (const f of Object.keys(item.onOpen?.setFlags ?? {})) settableFlags.add(f);
  for (const convo of content.conversations ?? [])
    for (const p of convo.prompts)
      for (const f of Object.keys(p.setFlags ?? {})) settableFlags.add(f);
  for (const ev of content.schedule ?? [])
    for (const f of Object.keys(ev.setFlags ?? {})) settableFlags.add(f);

  // --- Scheduled events: unique ids, valid gates ---
  const eventIds = new Set<string>();
  for (const ev of content.schedule ?? []) {
    const who = `event ${ev.id}`;
    if (eventIds.has(ev.id)) errors.push(`${who}: duplicate event id`);
    eventIds.add(ev.id);
    checkReq(who, ev.requires);
    if (ev.afterOnlineSeconds < 0) errors.push(`${who}: negative afterOnlineSeconds`);
  }

  for (const convo of content.conversations ?? []) {
    const who = `conversation ${convo.screenname}`;
    if (!buddyNames.has(convo.screenname)) errors.push(`${who}: no such buddy on the roster`);
    checkReq(who, convo.requires);
    const pids = new Set<string>();
    for (const p of convo.prompts) {
      if (pids.has(p.id)) errors.push(`${who}: duplicate prompt id "${p.id}"`);
      pids.add(p.id);
      checkReq(`${who}#${p.id}`, p.requires);
      for (const d of p.discover ?? [])
        if (!discoveryIds.has(d)) errors.push(`${who}#${p.id}: grants unknown discovery "${d}"`);
    }
  }
  // A `flag` requirement that nothing can ever set is a dead gate.
  const checkFlags = (owner: string, req: Requirement | undefined) => {
    if (!req) return;
    for (const leaf of leaves(req))
      if ('flag' in leaf && !settableFlags.has(leaf.flag))
        errors.push(`${owner}: requires flag "${leaf.flag}" which nothing ever sets`);
  };
  for (const item of content.items) checkFlags(item.id, item.requires);
  for (const buddy of content.buddies) {
    checkFlags(`buddy ${buddy.screenname}`, buddy.requires);
    for (const o of buddy.overrides ?? []) checkFlags(`buddy ${buddy.screenname} override`, o.requires);
  }
  for (const convo of content.conversations ?? []) {
    checkFlags(`conversation ${convo.screenname}`, convo.requires);
    for (const p of convo.prompts) checkFlags(`conversation ${convo.screenname}#${p.id}`, p.requires);
  }
  for (const ev of content.schedule ?? []) checkFlags(`event ${ev.id}`, ev.requires);

  // --- Every discovery must be grantable, finale must exist ---
  // Granters are items AND chat prompts (a live-conversation reveal counts
  // as a full path for the two-path rule).
  const granters = new Map<string, string[]>();
  for (const item of content.items)
    for (const d of item.onOpen?.discover ?? [])
      granters.set(d, [...(granters.get(d) ?? []), item.id]);
  for (const convo of content.conversations ?? [])
    for (const p of convo.prompts)
      for (const d of p.discover ?? [])
        granters.set(d, [...(granters.get(d) ?? []), `chat:${convo.screenname}#${p.id}`]);
  for (const d of content.discoveries) {
    const g = granters.get(d.id) ?? [];
    if (g.length === 0) errors.push(`discovery "${d.id}" is granted by nothing`);
    else if (g.length === 1 && !d.endsDemo)
      warnings.push(
        `discovery "${d.id}" has a single granting source (${g[0]}) — two-path rule`,
      );
  }
  if (!content.discoveries.some((d) => d.endsDemo))
    errors.push('no discovery has endsDemo — the season cannot conclude');

  // --- Reachability: simulate an omniscient-but-rule-abiding player ---
  const state = newPlayerState();
  state.loggedIn = true;
  state.online = true; // the omniscient player dials in immediately
  state.unlocked = [...Object.keys(content.passwords)]; // authored passwords are solvable
  const said = new Set<string>();
  const firedSim = new Set<string>();
  let changed = true;
  let rounds = 0;
  while (changed && rounds++ < 1000) {
    changed = false;
    // Scheduled events: the omniscient player has all the time in the world,
    // so timing is ignored — only the requirement gates matter here.
    for (const ev of content.schedule ?? []) {
      if (firedSim.has(ev.id) || !meetsRequirement(state, ev.requires)) continue;
      firedSim.add(ev.id);
      if (ev.setFlags) Object.assign(state.flags, ev.setFlags);
      changed = true;
    }
    for (const item of content.items) {
      if (state.opened.includes(item.id)) continue;
      // Wire content gets delivered the moment its requirements are met.
      if (item.arrivesOnline && !(state.delivered ??= []).includes(item.id) &&
          meetsRequirement(state, item.requires)) {
        state.delivered.push(item.id);
        changed = true;
      }
      if (!isAccessible(content, state, item)) continue;
      if (item.password && !state.unlocked.includes(item.id)) state.unlocked.push(item.id);
      state.opened.push(item.id);
      if (item.onOpen?.setFlags) Object.assign(state.flags, item.onOpen.setFlags);
      for (const d of item.onOpen?.discover ?? [])
        if (!state.discoveries.includes(d)) state.discoveries.push(d);
      changed = true;
    }
    // Live chat: a buddy who is visible and not offline will answer prompts.
    for (const convo of content.conversations ?? []) {
      const buddy = content.buddies.find((b) => b.screenname === convo.screenname);
      if (!buddy) continue;
      if (!meetsRequirement(state, buddy.requires) || !meetsRequirement(state, convo.requires)) continue;
      if (resolvePresence(state, buddy).status === 'offline') continue;
      for (const p of convo.prompts) {
        const key = `${convo.screenname}#${p.id}`;
        if (said.has(key) || !meetsRequirement(state, p.requires)) continue;
        said.add(key);
        if (p.setFlags) Object.assign(state.flags, p.setFlags);
        for (const d of p.discover ?? [])
          if (!state.discoveries.includes(d)) state.discoveries.push(d);
        changed = true;
      }
    }
  }
  for (const item of content.items)
    if (!state.opened.includes(item.id))
      errors.push(`item "${item.id}" is unreachable (requirements can never be met)`);
  for (const convo of content.conversations ?? [])
    for (const p of convo.prompts)
      if (!said.has(`${convo.screenname}#${p.id}`))
        errors.push(`chat prompt "${convo.screenname}#${p.id}" can never be said`);
  for (const d of content.discoveries)
    if (!state.discoveries.includes(d.id))
      errors.push(`discovery "${d.id}" can never be earned`);

  // --- Desktop cell collisions ---
  const cells = new Map<string, string>();
  for (const item of content.items) {
    const dsk = item.meta?.desktop;
    if (!dsk) continue;
    const key = `${dsk.x},${dsk.y}`;
    const prev = cells.get(key);
    if (prev) warnings.push(`desktop cell ${key} shared by ${prev} and ${item.id}`);
    cells.set(key, item.id);
  }

  // --- Passwords listed for review ---
  for (const id of passwordTargets)
    warnings.push(`password target "${id}" — confirm its solution is discoverable in-world`);
}

validate(SEASON1);

const gated = SEASON1.items.filter((i) => i.requires).length;
const prompts = (SEASON1.conversations ?? []).reduce((n, c) => n + c.prompts.length, 0);
console.log(
  `content: ${SEASON1.items.length} items (${gated} gated), ` +
    `${SEASON1.discoveries.length} discoveries, ${SEASON1.buddies.length} buddies, ` +
    `${(SEASON1.conversations ?? []).length} conversations (${prompts} prompts)`,
);
for (const w of warnings) console.log(`  warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR: ${e}`);
  console.error(`\ncontent validation FAILED (${errors.length} error(s))`);
  process.exit(1);
}
console.log('content validation passed');
