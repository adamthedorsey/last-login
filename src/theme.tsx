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
 * Legibility carve-out: bitmap fonts (ms_sans_serif, Fixedsys) render aliased
 * — that's their correct, crisp form. But vector reading faces (Times/Arial
 * on web pages, splash serif) get modern antialiasing back so long-form story
 * text stays comfortable on today's displays. Apply this on those surfaces.
 */
export const READABLE_TEXT = `
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
    /* Bitmap fonts (the OS chrome + Fixedsys) render aliased — their crisp,
       correct form. Reading surfaces with vector faces opt back into
       antialiasing via READABLE_TEXT for today's eyes. */
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
