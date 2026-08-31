/**
 * The main menu — the evidence room. The website hands the player here:
 * a dark room, the seized machine under one light. Any key (or a click)
 * powers it on: the camera drives INTO the dead CRT glass in stepped
 * frames until the screen's black fills everything — and the next black
 * screen is the POST. No story text lives here — box copy only.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { isMuted, playPowerOn, setMuted } from './sounds';
import { PIXEL_MONO } from '../theme';
import { usePlayerEmail, signOutPlayer } from '../game/playerAuth';
import pcImage from '../assets/images/main-menu-pc-v2.png';

const Room = styled.div`
  height: 100vh;
  background: #000;
  color: #b9b4a6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  overflow: hidden;
`;

const Title = styled.div`
  font-family: ${PIXEL_MONO};
  font-size: 64px;
  letter-spacing: 18px;
  color: #d8d3c4;
  text-shadow: 6px 6px 0 #000;
`;

const Tagline = styled.div`
  font-family: Arial, sans-serif;
  font-size: 17px;
  letter-spacing: 5px;
  color: #6d6a60;
  margin: 2px 0 8px;
`;

/** The zoom scales the photo toward the CRT glass (its center sits at
 * ~47.5% / 34.5% of the frame) in stepped frames — no easing. */
const Photo = styled.img`
  display: block;
  width: min(620px, 78vw, 58vh);
  image-rendering: auto;
  transform-origin: 47.5% 34.5%;
`;

const Hint = styled.div`
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  color: #8a8578;
  margin-top: 26px;
  min-height: 20px;
`;

const Copyright = styled.div`
  position: fixed;
  left: 16px;
  bottom: 12px;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #55524a;
`;

const SoundToggle = styled.button`
  position: fixed;
  right: 16px;
  bottom: 12px;
  background: none;
  border: none;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  color: #55524a;
  padding: 4px 6px;
`;

/** The player-account line (out of fiction, like the whole evidence room):
 * who is signed in, and a way out. Fixed top-right, away from the machine. */
const AccountBar = styled.div`
  position: fixed;
  top: 12px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #55524a;
`;

const SignOut = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 11px;
  color: #6d6a60;
  text-decoration: underline;
`;

/** Stepped zoom schedule: scale per frame, ~90ms apart. By the last
 * frames the dead screen's black is most of the viewport. */
const ZOOM_STEPS = [1.12, 1.28, 1.5, 1.8, 2.2, 2.8, 3.6, 4.8, 6.4];
const ZOOM_TICK_MS = 45;

// Shut Down hands the room back with a REVERSE zoom: the shutdown screen sets
// `lastlogin.zoomout` and reloads, and the freshly-mounted menu reads it here
// once — module-cached so React StrictMode's double-mount can't lose it — to
// start pulled all the way into the dead glass, then step back out to rest.
let pendingZoomOut: boolean | null = null;
function takeZoomOut(): boolean {
  if (pendingZoomOut === null) {
    try {
      pendingZoomOut = sessionStorage.getItem('lastlogin.zoomout') === '1';
      sessionStorage.removeItem('lastlogin.zoomout');
    } catch {
      pendingZoomOut = false;
    }
  }
  return pendingZoomOut;
}

export function MainMenu({ onPower }: { onPower: () => void }) {
  const [stage, setStage] = useState<'off' | 'zoom' | 'black' | 'zoomout'>(() =>
    takeZoomOut() ? 'zoomout' : 'off',
  );
  const [zoomIdx, setZoomIdx] = useState(() => (takeZoomOut() ? ZOOM_STEPS.length - 1 : -1));
  const [muted, setMutedState] = useState(isMuted);
  const playerEmail = usePlayerEmail();
  // Blocks power-on while the reverse zoom is still settling.
  const fired = useRef(takeZoomOut());

  const press = () => {
    if (fired.current) return;
    fired.current = true;
    playPowerOn();
    setStage('zoom');
    setZoomIdx(0);
  };

  // Drive the zoom frames, then cut to black.
  useEffect(() => {
    if (stage !== 'zoom' || zoomIdx < 0) return;
    if (zoomIdx >= ZOOM_STEPS.length) {
      setStage('black');
      return;
    }
    const t = window.setTimeout(() => setZoomIdx((i) => i + 1), ZOOM_TICK_MS);
    return () => window.clearTimeout(t);
  }, [stage, zoomIdx]);

  // Reverse zoom: Shut Down pulls the camera back OUT of the glass — the
  // power-on zoom played backward — settling on the resting room.
  useEffect(() => {
    if (stage !== 'zoomout') return;
    if (zoomIdx < 0) {
      setStage('off');
      fired.current = false; // the menu is live again
      return;
    }
    const t = window.setTimeout(() => setZoomIdx((i) => i - 1), ZOOM_TICK_MS);
    return () => window.clearTimeout(t);
  }, [stage, zoomIdx]);

  // A beat of black, then the POST takes over.
  useEffect(() => {
    if (stage !== 'black') return;
    const t = window.setTimeout(onPower, 250);
    return () => window.clearTimeout(t);
  }, [stage, onPower]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // "Any key" means any real key — not a bare modifier, not a browser
      // shortcut in flight.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      press();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === 'black') {
    return <Room style={{ cursor: 'none' }} />;
  }

  const zooming = stage === 'zoom';
  const zoomingOut = stage === 'zoomout';
  const busy = zooming || zoomingOut;
  const scale = zooming
    ? zoomIdx > 0
      ? ZOOM_STEPS[Math.min(zoomIdx, ZOOM_STEPS.length) - 1]
      : 1
    : zoomingOut && zoomIdx >= 0
      ? ZOOM_STEPS[zoomIdx]
      : 1;

  // The text snaps off during any zoom but keeps its layout space, so the
  // photo never jumps.
  const hidden = busy ? { visibility: 'hidden' as const } : undefined;

  return (
    <Room onClick={press} style={busy ? { cursor: 'none' } : undefined}>
      <Title style={hidden}>LAST LOGIN</Title>
      <Tagline style={hidden}>A DESKTOP MYSTERY GAME</Tagline>
      <Photo
        src={pcImage}
        alt=""
        draggable={false}
        style={{ transform: `scale(${scale})` }}
      />
      <Hint style={hidden}>Press any key to begin.</Hint>
      {playerEmail && (
        <AccountBar
          style={hidden}
          onClick={(e) => e.stopPropagation()}
          title="Your save account (not part of the game)"
        >
          <span>{playerEmail}</span>
          <SignOut
            onClick={(e) => {
              e.stopPropagation();
              void signOutPlayer();
            }}
          >
            Sign out
          </SignOut>
        </AccountBar>
      )}
      <Copyright style={hidden}>© Adam Dorsey. All rights reserved.</Copyright>
      <SoundToggle
        style={hidden}
        onClick={(e) => {
          e.stopPropagation();
          setMuted(!muted);
          setMutedState(!muted);
        }}
      >
        SOUND: {muted ? 'OFF' : 'ON'}
      </SoundToggle>
    </Room>
  );
}
