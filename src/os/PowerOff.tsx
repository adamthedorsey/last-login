/**
 * Powering the machine down. The GUI drops to a bare DOS-mode screen — just a
 * blinking block cursor, no mouse pointer (the driver has unloaded) — for a
 * couple of beats, then the "power" cuts and the evidence room returns with
 * the power-on zoom played in REVERSE (MainMenu reads `lastlogin.zoomout`).
 *
 * Shared by both Shut Down paths: the desktop's Shut Down dialog and the logon
 * dialog's Shut Down. A click skips the wait — the power switch, pressed early.
 */
import { useEffect } from 'react';
import styled from 'styled-components';
import { PIXEL_MONO } from '../theme';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100005;
  background: #000;
  color: #c9c9c9;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  padding: 12px 14px;
  cursor: none; /* DOS surface — the mouse driver is gone */
`;

// Snapping block cursor, never fading — the same blink as the boot/DOS screens.
const Cursor = styled.span`
  animation: poweroff-blink 0.9s steps(1) infinite;
  @keyframes poweroff-blink {
    50% {
      opacity: 0;
    }
  }
`;

const HOLD_MS = 2200;

function cutPower() {
  try {
    sessionStorage.removeItem('lastlogin.power');
    sessionStorage.setItem('lastlogin.zoomout', '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function PowerOff() {
  useEffect(() => {
    const t = window.setTimeout(cutPower, HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Screen onClick={cutPower}>
      <Cursor>█</Cursor>
    </Screen>
  );
}
