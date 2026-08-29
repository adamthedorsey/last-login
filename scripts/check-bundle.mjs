/**
 * Anti-cheat bundle audit: fails the build if any server-only story content
 * leaks into the production client bundle in dist/.
 * Run after `vite build`: npm run check:bundle  (or npm run verify)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

// Strings that only exist in server-side story content. If ANY of these
// appear in dist/, the content pipeline is broken.
const FORBIDDEN = [
  'sunflower97', // login password
  'GhostBridge', // the impersonator
  'junebug', // the code word (served via StateView, never client code)
  'stolen-intimacy', // discovery id
  'the-house', // final discovery id
  'bl_log_ghstbrdg', // recovered log filename
  'Ask him about my mail', // Rebecca's reveal line
  'wv history extra notes', // hidden ledger filename
  'SEASON1', // content export name
  'generateNeighborhood', // web generator (server-side content tooling)
  'radioactive_dave', // generated-web identity pool
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let failed = false;
let scanned = 0;
for (const file of walk(DIST)) {
  if (file.endsWith('.svg') || file.endsWith('.woff') || file.endsWith('.woff2')) continue;
  const text = readFileSync(file, 'latin1');
  scanned++;
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) {
      console.error(`LEAK: "${needle}" found in ${file}`);
      failed = true;
    }
  }
}

if (scanned === 0) {
  console.error('No files scanned — run `npm run build` first.');
  process.exit(1);
}
if (failed) {
  console.error('\nBundle audit FAILED: story content reached the client bundle.');
  process.exit(1);
}
console.log(`Bundle audit passed: ${scanned} files scanned, no story content leaked.`);
