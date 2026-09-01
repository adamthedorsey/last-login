import { createGlobalStyle, StyleSheetManager, ThemeProvider } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import { styleReset } from 'react95';
import original from 'react95/dist/themes/original';
import msSansBold from 'react95/dist/fonts/ms_sans_serif_bold.woff2';
import w95f2 from './assets/fonts/w95f.woff2';
import w95f from './assets/fonts/w95f.woff';
import fsex from '@south-paw/typeface-fixed-system-excelsior/files/fsex300.woff';
import curArrow from './assets/cursors/arrow.png';
import curWait from './assets/cursors/hourglass.png';
import curText from './assets/cursors/ibeam.png';
import curHand from './assets/cursors/hand.png';
import curAppStart from './assets/cursors/appstarting.png';
import type { ReactNode } from 'react';

/**
 * Machine-local monospace: Fixedsys Excelsior (public domain), the classic
 * Notepad/terminal bitmap look. Crisp at 16px multiples — use 16px.
 * Web-page content keeps Courier New; this font is for the "computer itself".
 */
export const PIXEL_MONO = "'Fixedsys', 'Courier New', monospace";

/**
 * Long-form document text (Notepad files, memos, logs): Arial — aliased
 * Courier is too thin to read at length (owner call; Arial/Georgia-era
 * faces are fair game, they shipped by 1997).
 */
export const DOC_TEXT = `
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.55;
`;

/**
 * Column-aligned evidence (items authored with meta.mono: the ledger,
 * modem.log): monospace is load-bearing there, and BOLD Courier keeps its
 * strokes readable aliased where the regular weight goes spindly.
 */
export const DOC_MONO = `
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: bold;
  line-height: 1.55;
`;

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  /* The chrome face is W95F (src/assets/fonts), registered UNDER react95's
     family name so every component picks it up without restyling. Bold
     stays on react95's bold face — both recreate the same original UI
     font, so the weights pair cleanly. */
  @font-face {
    font-family: 'ms_sans_serif';
    src: url(${w95f2}) format('woff2'), url(${w95f}) format('woff');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url(${msSansBold}) format('woff2');
    font-weight: bold;
    font-style: normal;
  }
  @font-face {
    font-family: 'Fixedsys';
    src: url(${fsex}) format('woff');
    font-weight: 400;
    font-style: normal;
  }
  html, body, #root {
    height: 100%;
    margin: 0;
    overflow: hidden;
  }
  /* Form controls do NOT inherit the document font by default — without
     this, every hand-rolled styled.button label silently renders in the
     browser's Arial. The chrome face is law everywhere. */
  button, input, textarea, select {
    font-family: inherit;
  }
  /* Buttons never wrap their labels — a Win95 button was always one line.
     The few buttons whose labels DO wrap by design (desktop icons,
     Explorer/CD-ROM icon cells) opt back in with white-space: normal on
     their label span. */
  button {
    white-space: nowrap;
  }
  body {
    font-family: 'ms_sans_serif', Tahoma, 'Segoe UI', sans-serif;
    font-size: 14px;
    background: #000;
    /* Desktop chrome is not selectable; readable panes opt back in. */
    user-select: none;
    /* ONE tier, no carve-outs (owner call): everything renders aliased, the
       way a real 1997 machine drew text — it had no font smoothing at all.
       Readability comes from face, size, and line-height: vector faces
       (Arial, Courier, Times) alias cleanly; only scaled bitmap fonts go
       ragged, so those never appear on reading surfaces. */
    -webkit-font-smoothing: none;
    text-rendering: optimizeSpeed;
  }
  * { box-sizing: border-box; }
  img { image-rendering: pixelated; }

  /* Win95 cursor set — our own pixel art in the classic shapes. The modern
     OS pointer is the last place the present day leaks in; not any more.
     Each var carries a keyword fallback in case an image fails to load. */
  :root {
    --cursor-arrow: url(${curArrow}) 0 0, default;
    --cursor-wait: url(${curWait}) 6 7, wait;
    --cursor-text: url(${curText}) 2 7, text;
    --cursor-hand: url(${curHand}) 5 0, pointer;
    --cursor-appstarting: url(${curAppStart}) 0 0, progress;
  }
  body { cursor: var(--cursor-arrow); }
  /* Win95 showed the ARROW over buttons and controls — never a hand, and
     never the host OS pointer. react95 paints modern 'default'/'pointer'
     cursors on buttons and inside menus, selects, tables, tabs and
     pickers — the !important out-guns those component styles everywhere;
     the busy rule below still wins on specificity. */
  button, select, label, summary,
  ul, li, td, th, tr { cursor: var(--cursor-arrow) !important; }
  /* ...and react95's div/span-built widgets (Select, pickers) inside any
     window shell. Resize handles opt out via data-resize. */
  [data-win-shell] div:not([data-resize]),
  [data-win-shell] span { cursor: var(--cursor-arrow) !important; }
  input, textarea { cursor: var(--cursor-text); }
  /* The 1997 web DID show the hand — but only on links. */
  a { cursor: var(--cursor-hand); }
  /* The busy hourglass, everywhere at once, exactly like the real thing.
     (The shell seal above is more specific, so it is mirrored here.) */
  html.busy, html.busy * { cursor: var(--cursor-wait) !important; }
  html.busy [data-win-shell] div:not([data-resize]),
  html.busy [data-win-shell] span,
  html.busy button, html.busy li { cursor: var(--cursor-wait) !important; }
  /* Program launch: same everywhere-at-once takeover, but the value
     flickers on the launch scheduler (src/os/launchBusy.ts). */
  html.launching, html.launching * { cursor: var(--cursor-launch, var(--cursor-wait)) !important; }
  html.launching [data-win-shell] div:not([data-resize]),
  html.launching [data-win-shell] span,
  html.launching button, html.launching li { cursor: var(--cursor-launch, var(--cursor-wait)) !important; }
`;

// react95 v4 was written for styled-components v5 prop forwarding; with v6 we
// filter non-standard props off DOM elements ourselves.
function forwardProp(propName: string, target: unknown): boolean {
  if (typeof target === 'string') return isPropValid(propName);
  return true;
}

export function Chrome({ children }: { children: ReactNode }) {
  return (
    <StyleSheetManager shouldForwardProp={forwardProp}>
      <ThemeProvider theme={original}>
        <GlobalStyles />
        {children}
      </ThemeProvider>
    </StyleSheetManager>
  );
}
