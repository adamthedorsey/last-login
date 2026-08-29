/**
 * Regenerates supabase/seed.sql from the TypeScript season content
 * (the single source of truth). Run with: npm run gen:seed
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEASON1 } from '../supabase/functions/_shared/gamecore/season1.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const seasons = [SEASON1];

const header = `-- GENERATED FILE — do not edit by hand.
-- Source of truth: supabase/functions/_shared/gamecore/season1.ts
-- Regenerate with: npm run gen:seed
`;

const stmts = seasons.map((s) => {
  const json = JSON.stringify(s).replace(/'/g, "''");
  return `insert into game.seasons (slug, title, content)
values ('${s.slug}', '${s.title.replace(/'/g, "''")}', '${json}'::jsonb)
on conflict (slug) do update set title = excluded.title, content = excluded.content;`;
});

const out = header + '\n' + stmts.join('\n\n') + '\n';
writeFileSync(resolve(root, 'supabase/seed.sql'), out);
console.log('Wrote supabase/seed.sql');
