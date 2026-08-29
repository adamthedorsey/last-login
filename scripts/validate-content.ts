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
import { isAccessible } from '../supabase/functions/_shared/gamecore/engine.ts';
import {
  newPlayerState,
  type ContentItem,
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
    for (const d of item.onOpen?.discover ?? [])
      if (!discoveryIds.has(d)) errors.push(`${item.id}: grants unknown discovery "${d}"`);
  }
  for (const buddy of content.buddies) {
    checkReq(`buddy ${buddy.screenname}`, buddy.requires);
    if (buddy.conversationId && !itemIds.has(buddy.conversationId))
      errors.push(`buddy ${buddy.screenname}: unknown conversationId "${buddy.conversationId}"`);
  }
  if (!passwordTargets.has(content.computer.loginTargetId))
    errors.push(`computer.loginTargetId "${content.computer.loginTargetId}" has no password`);

  // --- Every discovery must be grantable, finale must exist ---
  const granters = new Map<string, ContentItem[]>();
  for (const item of content.items)
    for (const d of item.onOpen?.discover ?? [])
      granters.set(d, [...(granters.get(d) ?? []), item]);
  for (const d of content.discoveries) {
    const g = granters.get(d.id) ?? [];
    if (g.length === 0) errors.push(`discovery "${d.id}" is granted by nothing`);
    else if (g.length === 1 && !d.endsDemo)
      warnings.push(
        `discovery "${d.id}" has a single granting item (${g[0].id}) — two-path rule`,
      );
  }
  if (!content.discoveries.some((d) => d.endsDemo))
    errors.push('no discovery has endsDemo — the season cannot conclude');

  // --- Reachability: simulate an omniscient-but-rule-abiding player ---
  const state = newPlayerState();
  state.loggedIn = true;
  state.unlocked = [...Object.keys(content.passwords)]; // authored passwords are solvable
  let changed = true;
  let rounds = 0;
  while (changed && rounds++ < 1000) {
    changed = false;
    for (const item of content.items) {
      if (state.opened.includes(item.id)) continue;
      if (!isAccessible(content, state, item)) continue;
      if (item.password && !state.unlocked.includes(item.id)) state.unlocked.push(item.id);
      state.opened.push(item.id);
      if (item.onOpen?.setFlags) Object.assign(state.flags, item.onOpen.setFlags);
      for (const d of item.onOpen?.discover ?? [])
        if (!state.discoveries.includes(d)) state.discoveries.push(d);
      changed = true;
    }
  }
  for (const item of content.items)
    if (!state.opened.includes(item.id))
      errors.push(`item "${item.id}" is unreachable (requirements can never be met)`);
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
console.log(
  `content: ${SEASON1.items.length} items (${gated} gated), ` +
    `${SEASON1.discoveries.length} discoveries, ${SEASON1.buddies.length} buddies`,
);
for (const w of warnings) console.log(`  warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR: ${e}`);
  console.error(`\ncontent validation FAILED (${errors.length} error(s))`);
  process.exit(1);
}
console.log('content validation passed');
