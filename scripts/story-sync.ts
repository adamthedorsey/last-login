/**
 * Story <-> content sync check.
 * Run: npm run story        (also runs inside gen:seed and verify)
 *
 * The story bible in `story/` is the source of truth. The game in
 * `season1.ts` implements it. This script is the seam between them: it
 * reads every id the bible cites and every story-bearing thing the game
 * ships, and reports where the two have drifted.
 *
 * ERRORS (exit 1)
 *   - the bible cites an id the game does not have (a story change that
 *     hasn't landed in content yet, or a typo)
 * WARNINGS
 *   - the game ships a story-bearing thing no bible page mentions
 *     (content nobody is tracking; usually means the bible is behind)
 *
 * Mundane camouflage (the ~180 ungated flavor items) is deliberately
 * exempt: it exists to be unremarkable and does not need a bible entry.
 *
 * Side effect: rewrites `story/INDEX.md`, the generated coverage map.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SEASON1 } from '../supabase/functions/_shared/gamecore/season1.ts';
import type { Requirement, SeasonContent } from '../supabase/functions/_shared/gamecore/types.ts';

const STORY_DIR = 'story';
const ROOT = process.cwd();

type Entity = {
  id: string;
  kind: string;
  label: string;
  /** story-bearing things must be covered by the bible; camouflage need not */
  mustCover: boolean;
};

// --------------------------------------------------------------- the game
function leaves(req: Requirement | undefined): Array<Record<string, string>> {
  if (!req) return [];
  if ('all' in req) return req.all.flatMap(leaves);
  if ('any' in req) return req.any.flatMap(leaves);
  return [req as Record<string, string>];
}

function collect(content: SeasonContent): { entities: Entity[]; flags: Set<string> } {
  const entities: Entity[] = [];
  const flags = new Set<string>();

  const noteFlags = (req?: Requirement) => {
    for (const leaf of leaves(req)) if ('flag' in leaf) flags.add(leaf.flag);
  };

  for (const d of content.discoveries) {
    entities.push({ id: d.id, kind: 'discovery', label: d.title, mustCover: true });
  }

  for (const i of content.items) {
    noteFlags(i.requires);
    for (const f of Object.keys(i.onOpen?.setFlags ?? {})) flags.add(f);
    // Story-bearing: gated, grants something, locked, or arrives over the wire.
    const mustCover = Boolean(i.requires || i.onOpen || i.password || i.arrivesOnline);
    entities.push({ id: i.id, kind: `item:${i.kind}`, label: i.name, mustCover });
  }

  for (const c of content.conversations) {
    entities.push({
      id: c.screenname,
      kind: 'conversation',
      label: `${c.prompts.length} prompts`,
      mustCover: true,
    });
    for (const p of c.prompts) {
      noteFlags(p.requires);
      for (const f of Object.keys(p.setFlags ?? {})) flags.add(f);
    }
    for (const j of c.interjections ?? []) noteFlags(j.requires);
  }

  for (const b of content.buddies) {
    noteFlags(b.requires);
    for (const o of b.overrides ?? []) noteFlags(o.requires);
  }

  for (const e of content.schedule) {
    noteFlags(e.requires);
    for (const f of Object.keys(e.setFlags ?? {})) flags.add(f);
    entities.push({ id: e.id, kind: 'event', label: `+${e.afterOnlineSeconds}s`, mustCover: true });
  }

  for (const r of content.remoteAccess ?? []) {
    noteFlags(r.requires);
    for (const f of Object.keys(r.onDone?.setFlags ?? {})) flags.add(f);
    entities.push({ id: r.id, kind: 'remote', label: `${r.script.length} lines`, mustCover: true });
  }

  for (const m of content.handler?.messages ?? []) {
    noteFlags(m.requires);
    entities.push({ id: m.id, kind: 'handler', label: m.subject, mustCover: true });
  }

  for (const t of Object.keys(content.passwords)) {
    entities.push({ id: t, kind: 'password', label: 'standalone target', mustCover: true });
  }

  return { entities, flags };
}

// -------------------------------------------------------------- the bible
function storyFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...storyFiles(p));
    else if (name.endsWith('.md') && name !== 'INDEX.md') out.push(p);
  }
  return out.sort();
}

/** Citations are backticked tokens, plus `[SHIPPED: id]` / `[CONTENT: id]`. */
function citations(text: string): Set<string> {
  const found = new Set<string>();
  for (const m of text.matchAll(/`([^`\n]{1,80})`/g)) found.add(m[1].trim());
  for (const m of text.matchAll(/\[(?:SHIPPED|CONTENT):\s*([^\]]+)\]/g)) {
    for (const part of m[1].split(/[,;]/)) found.add(part.trim());
  }
  return found;
}

/**
 * A dotted, lowercase token looks like a content id and must resolve.
 * Real-world filenames, URLs, and paths are cited constantly in the bible
 * and are not ids, so they are excluded by shape.
 */
const FILE_EXT =
  /\.(md|ts|tsx|js|mjs|cjs|json|txt|doc|log|dat|gif|jpe?g|png|svg|wav|mp3|m4a|html?|css|sql|pgp|chk|sys|exe|bat|ini)$/i;
const looksLikeId = (t: string, namespaces: Set<string>) =>
  /^[a-z][a-z0-9]*\.[a-zA-Z0-9][a-zA-Z0-9.\-]*$/.test(t) &&
  !FILE_EXT.test(t) &&
  !t.startsWith('www.') &&
  !t.includes('/') &&
  // Only tokens in a namespace the content actually uses (file., email., evt.)
  // can be a broken id. Config paths like `computer.saverText` are legitimate
  // citations of the content model, not entity ids, and are left alone.
  namespaces.has(t.split('.')[0]);

// ----------------------------------------------------------------- report
const { entities, flags } = collect(SEASON1);
const known = new Map(entities.map((e) => [e.id, e]));
/** First segment of every real id: the namespaces a typo could live in. */
const namespaces = new Set(
  entities.map((e) => e.id.split('.')[0]),
);
const errors: string[] = [];
const warnings: string[] = [];

/** id -> story files that cite it */
const coverage = new Map<string, Set<string>>();
const files = storyFiles(STORY_DIR);

for (const file of files) {
  const rel = relative(ROOT, file);
  const cited = citations(readFileSync(file, 'utf8'));
  for (const token of cited) {
    if (known.has(token) || flags.has(token)) {
      if (!coverage.has(token)) coverage.set(token, new Set());
      coverage.get(token)!.add(rel);
    } else if (looksLikeId(token, namespaces)) {
      errors.push(`${rel}: cites "${token}", which is not in season1.ts`);
    }
  }
}

const uncovered = entities.filter((e) => e.mustCover && !coverage.has(e.id));
for (const e of uncovered) {
  warnings.push(`${e.kind} "${e.id}" (${e.label}) is story-bearing but no bible page mentions it`);
}
const uncoveredFlags = [...flags].filter((f) => !coverage.has(f));

// ------------------------------------------------------------- INDEX.md
const byKind = new Map<string, Entity[]>();
for (const e of entities) {
  if (!e.mustCover) continue;
  if (!byKind.has(e.kind)) byKind.set(e.kind, []);
  byKind.get(e.kind)!.push(e);
}

const lines: string[] = [
  '# Story ↔ game coverage map',
  '',
  '> GENERATED — do not edit. Regenerate: `npm run story`',
  '>',
  '> Every story-bearing thing the game ships, and which bible page documents it.',
  `> ${entities.filter((e) => e.mustCover).length} story-bearing entities · ` +
    `${entities.length - entities.filter((e) => e.mustCover).length} mundane camouflage (exempt).`,
  '',
];

for (const kind of [...byKind.keys()].sort()) {
  lines.push(`## ${kind}`, '', '| id | what | documented in |', '|---|---|---|');
  for (const e of byKind.get(kind)!.sort((a, b) => a.id.localeCompare(b.id))) {
    const where = coverage.get(e.id);
    const cell = where ? [...where].map((f) => f.replace('story/', '')).join(', ') : '**— nothing —**';
    lines.push(`| \`${e.id}\` | ${e.label} | ${cell} |`);
  }
  lines.push('');
}

lines.push('## engine flags', '', '| flag | documented in |', '|---|---|');
for (const f of [...flags].sort()) {
  const where = coverage.get(f);
  lines.push(`| \`${f}\` | ${where ? [...where].map((x) => x.replace('story/', '')).join(', ') : '—'} |`);
}
lines.push('');

writeFileSync(join(STORY_DIR, 'INDEX.md'), lines.join('\n'));

// ------------------------------------------------------------------ exit
console.log(
  `story: ${files.length} bible pages · ${entities.filter((e) => e.mustCover).length} story-bearing entities · ` +
    `${coverage.size} cited · story/INDEX.md written`,
);
for (const w of warnings) console.log(`  warn: ${w}`);
if (uncoveredFlags.length) console.log(`  warn: flags no page mentions: ${uncoveredFlags.join(', ')}`);
for (const e of errors) console.error(`  ERROR: ${e}`);
if (errors.length) {
  console.error(`\nstory sync FAILED — ${errors.length} dangling reference(s).`);
  console.error('The bible names content the game does not have. Either add it to');
  console.error('season1.ts, or fix the citation.');
  process.exit(1);
}
console.log('story sync passed');
