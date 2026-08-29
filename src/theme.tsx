import { createGlobalStyle, StyleSheetManager, ThemeProvider } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import { styleReset } from 'react95';
import original from 'react95/dist/themes/original';
import msSans from 'react95/dist/fonts/ms_sans_serif.woff2';
import msSansBold from 'react95/dist/fonts/ms_sans_serif_bold.woff2';
import fsex from '@south-paw/typeface-fixed-system-excelsior/files/fsex300.woff';
import type { ReactNode } from 'react';

/**
 * Machine-local monospace: Fixedsys Excelsior (public domain), the classic
 * Notepad/terminal bitmap look. Crisp at 16px multiples — use 16px.
 * Web-page content keeps Courier New; this font is for the "computer itself".
 */
export const PIXEL_MONO = "'Fixedsys', 'Courier New', monospace";

/**
 * Long-form document text (Notepad files, recovered logs): Courier New at a
 * comfortable size. Monospace is load-bearing — story documents contain
 * column-aligned ASCII (the ledger, file-properties blocks) that a
 * proportional face would shred.
 *
 * THE one exception to the aliased-everywhere rule: Courier New is too
 * spindly to survive without smoothing — aliased, its hairline strokes
 * break apart and long documents become genuinely hard to read. Documents
 * opt back into antialiasing; every other surface stays aliased.
 */
export const DOC_TEXT = `
  font-family: 'Courier New', monospace;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: auto;
  text-rendering: auto;
`;

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url(${msSans}) format('woff2');
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
