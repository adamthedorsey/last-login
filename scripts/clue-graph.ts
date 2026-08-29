/**
 * Clue-graph visualizer — generates docs/clue-graph.md (Mermaid) from the
 * SHIPPING season content, so the diagram can never drift from the game.
 * Run: npm run graph
 *
 * Reading the graph:
 *   [rectangles]  gated/granting items (the evidence)
 *   (stadiums)    discoveries (named understandings)
 *   [/slashes/]   password gates
 *   ==>           "opening this GRANTS that discovery"
 *   -->           "this REQUIRES that" (AND/OR on the label)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEASON1 } from '../supabase/functions/_shared/gamecore/season1.ts';
import type { ContentItem, Requirement, SeasonContent } from '../supabase/functions/_shared/gamecore/types.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function nid(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function esc(s: string): string {
  return s.replace(/"/g, '#quot;');
}

interface Leaf {
  combinator: 'AND' | 'OR' | 'REQ';
  leaf: Record<string, string>;
}

function leaves(req: Requirement, combinator: Leaf['combinator'] = 'REQ'): Leaf[] {
  if ('all' in req) return req.all.flatMap((r) => leaves(r, 'AND'));
  if ('any' in req) return req.any.flatMap((r) => leaves(r, 'OR'));
  return [{ combinator, leaf: req as Record<string, string> }];
}

const KIND_GLYPH: Record<string, string> = {
  email: 'email',
  im_conversation: 'IM log',
  document: 'file',
  webpage: 'web',
  photo: 'photo',
  folder: 'folder',
  trash_item: 'recycle bin',
  mailbox: 'mailbox',
  shortcut: 'shortcut',
  bookmark: 'bookmark',
};

function generate(content: SeasonContent): string {
  const lines: string[] = [];
  const nodes = new Set<string>();
  const add = (line: string) => lines.push(`  ${line}`);
  const declare = (id: string, decl: string) => {
    if (!nodes.has(id)) {
      nodes.add(id);
      add(decl);
    }
  };

  // Items worth drawing: anything gated, granting, or password-locked —
  // plus items referenced by an `opened` requirement.
  const referencedByOpened = new Set<string>();
  for (const item of content.items)
    if (item.requires)
      for (const { leaf } of leaves(item.requires))
        if ('opened' in leaf) referencedByOpened.add(leaf.opened);

  const interesting = (i: ContentItem) =>
    !!i.requires || !!i.password || (i.onOpen?.discover?.length ?? 0) > 0 || referencedByOpened.has(i.id);

  const itemDecl = (i: ContentItem) => {
    const kind = KIND_GLYPH[i.kind] ?? i.kind;
    const cls = i.password ? 'locked' : 'item';
    return `${nid('i', i.id)}["${esc(i.name)}<br/><i>${kind}</i>"]:::${cls}`;
  };

  // Login gate up front.
  add(`login[/"COMPUTER LOGIN<br/><i>password: ${esc(content.computer.loginTargetId)}</i>"/]:::locked`);
  add(`login ~~~ loginNote["everything below requires the login"]:::note`);

  for (const d of content.discoveries) {
    declare(
      nid('d', d.id),
      `${nid('d', d.id)}(["${esc(d.title)}${d.endsDemo ? '<br/><b>END OF SEASON</b>' : ''}"]):::${d.endsDemo ? 'finale' : 'discovery'}`,
    );
  }

  for (const item of content.items) {
    if (!interesting(item)) continue;
    declare(nid('i', item.id), itemDecl(item));

    for (const d of item.onOpen?.discover ?? []) {
      add(`${nid('i', item.id)} ==>|grants| ${nid('d', d)}`);
    }
    if (item.requires) {
      for (const { combinator, leaf } of leaves(item.requires)) {
        const label = combinator === 'REQ' ? 'requires' : combinator;
        if ('discovery' in leaf) add(`${nid('d', leaf.discovery)} -->|${label}| ${nid('i', item.id)}`);
        if ('opened' in leaf) {
          const src = content.items.find((x) => x.id === leaf.opened);
          if (src) declare(nid('i', src.id), itemDecl(src));
          add(`${nid('i', leaf.opened)} -.->|${label}: opened| ${nid('i', item.id)}`);
        }
        if ('unlocked' in leaf) add(`${nid('p', leaf.unlocked)} -->|${label}: unlocked| ${nid('i', item.id)}`);
        if ('flag' in leaf) add(`flag_${leaf.flag} -->|${label}: flag| ${nid('i', item.id)}`);
      }
    }
  }

  // Gated buddies (visibility in the Chat roster).
  for (const b of content.buddies) {
    if (!b.requires) continue;
    const bid = nid('b', b.screenname);
    declare(bid, `${bid}["${esc(b.screenname)}<br/><i>buddy appears</i>"]:::item`);
    for (const { combinator, leaf } of leaves(b.requires)) {
      const label = combinator === 'REQ' ? 'requires' : combinator;
      if ('discovery' in leaf) add(`${nid('d', leaf.discovery)} -->|${label}| ${bid}`);
    }
  }

  const gated = content.items.filter((i) => i.requires).length;
  const granting = content.items.filter((i) => (i.onOpen?.discover?.length ?? 0) > 0).length;
  const mundane = content.items.length - gated - granting;

  return `# Clue graph — ${content.title}

> GENERATED — do not edit. Source of truth: \`season1.ts\`. Regenerate: \`npm run graph\`
>
> In-world date: ${content.clock.now.slice(0, 10)} · ${content.items.length} items
> (${gated} gated · ${granting} granting · ~${mundane} mundane camouflage) ·
> ${content.discoveries.length} discoveries

\`\`\`mermaid
flowchart TD
  classDef discovery fill:#fffa9d,stroke:#887722,color:#111
  classDef finale fill:#ffb3d9,stroke:#8a1055,color:#111,stroke-width:3px
  classDef item fill:#e8e8e8,stroke:#555,color:#111
  classDef locked fill:#cfe0f5,stroke:#1a3a8a,color:#111
  classDef note fill:none,stroke:none,color:#888
${lines.join('\n')}
\`\`\`

Legend: rectangles are evidence items · stadiums are discoveries · slashed boxes
are password gates · \`grants\` = opening the item earns the discovery ·
\`requires\` = the item is invisible until the discovery is earned (AND/OR shown
on multi-requirement edges) · dotted = requires *opening* an item.
`;
}

mkdirSync(resolve(root, 'docs'), { recursive: true });
writeFileSync(resolve(root, 'docs/clue-graph.md'), generate(SEASON1));
console.log('Wrote docs/clue-graph.md');
