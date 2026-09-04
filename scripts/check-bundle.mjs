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
  'nightshift', // the watcher's screen name
  'lowtide', // the Solitaire backdoor password
  'junebug', // the code word (served via StateView, never client code)
  'stolen-intimacy', // discovery id
  'the-house', // final discovery id
  'bl_log_ntshft', // recovered log filename
  'Ask him about my mail', // Rebecca's reveal line
  'wv history extra notes', // hidden ledger filename
  'SEASON1', // content export name
  'generateNeighborhood', // web generator (server-side content tooling)
  'radioactive_dave', // generated-web identity pool
  'poem drafts 2', // hidden Oct 8 log (path B, stolen-intimacy)
  'Simple has an alibi', // Register timeline page (path B, chads-window)
  'a friend of the family', // nightshift's epilogue line
  'sadie-talking', // conversation flag
  'nightshift-signoff', // epilogue flag
  'not shut down properly', // boot warning (server-sent story line)
  'Last session ended', // the 2:31 AM stamp that goes with it
  'moms flower', // casey's password hint (earned after failed attempts)
  '2141-1011', // DOS volume serial (the finale timestamp, hiding in plain sight)
  '02:17 AM', // the modem log's smoking-gun session
  'Mercer',
  'Prescott',
  'Oxytera', // the case handler's field contact (voice briefing)
  'out of eyes and out of weeks', // briefing transcript
  'Field Evidence Software', // setup wizard page (handler content)
  'START HERE', // the desktop README's opening line
  'TAYLOR, CASEY ANN', // the Case Summary page (handler content)
  'First Bank of Humble', // phone-line content (server-authored, canary)
  'HZLINK', // the remote-access takeover script (served only once triggered)
  'the-watcher', // its discovery id
  'buy their own weather', // the sheriff's gated memo (handler content)
  'CASE 97-0244', // the case-file header (served via getCaseFile)
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
