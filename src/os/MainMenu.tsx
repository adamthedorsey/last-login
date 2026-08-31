/**
 * The main menu — the evidence room. The website hands the player here:
 * a dark room, the seized machine on a table, an evidence tag on the
 * tower. The only real control is the POWER button; pressing it (or
 * Enter) spins the fan and starts the cold boot. No story text lives
 * here — box copy only. Everything is stepped, nothing eases.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { isMuted, playPowerOn, setMuted } from './sounds';
import { PIXEL_MONO } from '../theme';

const Room = styled.div`
  height: 100vh;
  background: #0b0b0d;
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
  margin: 10px 0 34px;
`;

const Hint = styled.div`
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  color: #6d6a60;
  margin-top: 30px;
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

/** The machine, flat and period: CRT, tower with the power button, tag. */
function Machine({
  stage,
  onPower,
}: {
  stage: 'off' | 'spinning';
  onPower: () => void;
}) {
  const led = stage === 'spinning';
  return (
    <svg width={480} height={300} viewBox="0 0 480 300" style={{ imageRendering: 'pixelated' }}>
      {/* table */}
      <rect x={12} y={264} width={456} height={10} fill="#2a241c" />
      <rect x={12} y={274} width={456} height={4} fill="#1c1812" />

      {/* CRT monitor */}
      <rect x={70} y={40} width={220} height={180} fill="#8f8a7a" />
      <rect x={70} y={40} width={220} height={6} fill="#a49e8c" />
      <rect x={70} y={214} width={220} height={6} fill="#5f5b4f" />
      <rect x={90} y={58} width={180} height={134} fill="#11150f" />
      {led && <rect x={90} y={58} width={180} height={134} fill="#161c13" />}
      {/* glare, a hard corner shape */}
      <polygon points="98,66 150,66 108,110 98,110" fill={led ? '#232a1d' : '#1b201a'} />
      {/* monitor foot */}
      <rect x={150} y={220} width={60} height={12} fill="#7c7767" />
      <rect x={130} y={232} width={100} height={10} fill="#8f8a7a" />
      <rect x={130} y={242} width={100} height={22} fill="#6d685a" />
      {/* monitor power dot */}
      <rect x={252} y={200} width={8} height={6} fill={led ? '#3f7a2f' : '#33302a'} />

      {/* tower */}
      <rect x={330} y={64} width={92} height={200} fill="#8f8a7a" />
      <rect x={330} y={64} width={92} height={6} fill="#a49e8c" />
      <rect x={330} y={258} width={92} height={6} fill="#5f5b4f" />
      <rect x={342} y={84} width={68} height={12} fill="#6d685a" />
      <rect x={342} y={104} width={68} height={8} fill="#7c7767" />
      {/* floppy slit */}
      <rect x={342} y={126} width={68} height={4} fill="#4b4840" />
      {/* LED */}
      <rect x={346} y={196} width={10} height={6} fill={led ? '#4f9a37' : '#33302a'} />

      {/* the POWER button */}
      <g
        onClick={stage === 'off' ? onPower : undefined}
        style={{ cursor: 'var(--cursor-arrow)' }}
      >
        <rect x={366} y={186} width={30} height={26} fill="#7c7767" />
        <rect x={370} y={190} width={22} height={18} fill={led ? '#5f5b4f' : '#9b9585'} />
        <rect x={372} y={192} width={18} height={2} fill={led ? '#4b4840' : '#b0aa98'} />
      </g>

      {/* evidence tag, hanging off the tower on a string */}
      <line x1={422} y1={100} x2={446} y2={140} stroke="#6d6a60" strokeWidth={1} />
      <g transform="rotate(8 446 140)">
        <rect x={420} y={140} width={58} height={84} fill="#cdbd8b" />
        <rect x={420} y={140} width={58} height={84} fill="none" stroke="#8f8468" strokeWidth={2} />
        <circle cx={449} cy={150} r={4} fill="#0b0b0d" stroke="#8f8468" strokeWidth={2} />
        <text x={449} y={172} textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize={11} fill="#8d2f23">
          EVIDENCE
        </text>
        <rect x={428} y={182} width={42} height={2} fill="#8f8468" />
        <rect x={428} y={192} width={42} height={2} fill="#8f8468" />
        <rect x={428} y={202} width={42} height={2} fill="#8f8468" />
        <rect x={428} y={212} width={26} height={2} fill="#8f8468" />
      </g>
    </svg>
  );
}

export function MainMenu({ onPower }: { onPower: () => void }) {
  const [stage, setStage] = useState<'off' | 'spinning'>('off');
  const [muted, setMutedState] = useState(isMuted);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') press();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Room>
      <Title>LAST LOGIN</Title>
      <Tagline>A 1997 DESKTOP MYSTERY</Tagline>
      <Machine stage={stage} onPower={press} />
      <Hint>{stage === 'off' ? 'Press POWER to begin.' : ' '}</Hint>
      <SoundToggle
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
      >
        SOUND: {muted ? 'OFF' : 'ON'}
      </SoundToggle>
    </Room>
  );
}
