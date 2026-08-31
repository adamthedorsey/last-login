/**
 * The main menu — the evidence room. The website hands the player here:
 * a dark room, the seized machine under one light. Any key (or a click)
 * powers it on and starts the cold boot. No story text lives here — box
 * copy only. Everything is stepped, nothing eases.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { isMuted, playPowerOn, setMuted } from './sounds';
import { PIXEL_MONO } from '../theme';
import pcImage from '../assets/images/main-menu-pc.png';

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
  font-size: 32px;
  letter-spacing: 10px;
  color: #d8d3c4;
  text-shadow: 4px 4px 0 #000;
`;

const Tagline = styled.div`
  font-family: Arial, sans-serif;
  font-size: 14px;
  letter-spacing: 4px;
  color: #6d6a60;
  margin: 10px 0 8px;
`;

const Photo = styled.img`
  display: block;
  width: min(620px, 78vw, 58vh);
  image-rendering: auto;
`;

const Hint = styled.div`
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  color: #8a8578;
  margin-top: 6px;
  min-height: 20px;
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

export function MainMenu({ onPower }: { onPower: () => void }) {
  const [stage, setStage] = useState<'off' | 'spinning'>('off');
  const [muted, setMutedState] = useState(isMuted);
  // The hint blinks on a stepped clock, like a DOS prompt waiting.
  const [blink, setBlink] = useState(true);
  const fired = useRef(false);

  const press = () => {
    if (fired.current) return;
    fired.current = true;
    setStage('spinning');
    playPowerOn();
    // The machine takes a moment to come alive — stepped, not eased.
    window.setTimeout(onPower, 1200);
  };

  useEffect(() => {
    const t = window.setInterval(() => setBlink((b) => !b), 800);
    return () => window.clearInterval(t);
  }, []);

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

  return (
    <Room onClick={press}>
      <Title>LAST LOGIN</Title>
      <Tagline>A 1997 DESKTOP MYSTERY</Tagline>
      <Photo src={pcImage} alt="" draggable={false} />
      <Hint>{stage === 'off' && blink ? 'Press any key to begin.' : ' '}</Hint>
      <SoundToggle
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
