/**
 * "Flying Floppies" — the Horizons 97 screen saver. An original homage to the
 * great absurd-household-objects savers of the era: winged 3.5" floppy disks
 * flap diagonally across a black screen while CDs drift and spin among them.
 *
 * Motion is period-honest: constant-velocity linear drift (no easing) and a
 * two-frame stepped wing flap, like sprite animation.
 */
import { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

const Black = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 100010; /* above everything, taskbar included */
  overflow: hidden;
  cursor: none;
`;

const fly = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-165vw, 95vw, 0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// Two-frame wing flap, hard-stepped like a sprite sheet.
const frameA = keyframes`
  0%, 49.9% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;
const frameB = keyframes`
  0%, 49.9% { opacity: 0; }
  50%, 100% { opacity: 1; }
`;

const Flyer = styled.div<{ $dur: number; $delay: number; $scale: number }>`
  position: absolute;
  will-change: transform;
  animation: ${fly} ${(p) => p.$dur}s linear infinite;
  animation-delay: ${(p) => p.$delay}s;
  transform-origin: center;
  scale: ${(p) => p.$scale};

  .wingA {
    animation: ${frameA} 0.28s steps(1) infinite;
  }
  .wingB {
    animation: ${frameB} 0.28s steps(1) infinite;
  }
  .disc {
    animation: ${spin} 5s linear infinite;
    transform-origin: 32px 32px;
  }
`;

function WingedFloppy() {
  return (
    <svg width="86" height="80" viewBox="0 0 86 80" aria-hidden>
      {/* wings: frame A (up) */}
      <g className="wingA" fill="#f0f0f4" stroke="#c8c8d0" strokeWidth="1">
        <path d="M22 34 Q10 24 6 6 Q16 16 20 14 Q22 22 24 30 Z" />
        <path d="M64 34 Q76 24 80 6 Q70 16 66 14 Q64 22 62 30 Z" />
      </g>
      {/* wings: frame B (down) */}
      <g className="wingB" fill="#e0e0e8" stroke="#b8b8c4" strokeWidth="1">
        <path d="M22 36 Q8 42 4 58 Q16 50 20 52 Q22 44 24 38 Z" />
        <path d="M64 36 Q78 42 82 58 Q70 50 66 52 Q64 44 62 38 Z" />
      </g>
      {/* the floppy */}
      <g shapeRendering="crispEdges">
        <rect x="22" y="26" width="42" height="42" fill="#2a3a8a" />
        <rect x="22" y="26" width="42" height="2" fill="#4a5aae" />
        <rect x="34" y="26" width="20" height="14" fill="#b8b8c8" />
        <rect x="44" y="29" width="6" height="9" fill="#5a5a6a" />
        <rect x="28" y="46" width="30" height="20" fill="#e8e8e0" />
        <rect x="31" y="50" width="24" height="1.5" fill="#9a9aa0" />
        <rect x="31" y="54" width="24" height="1.5" fill="#9a9aa0" />
        <rect x="31" y="58" width="16" height="1.5" fill="#9a9aa0" />
        <rect x="24" y="62" width="4" height="4" fill="#111122" />
      </g>
    </svg>
  );
}

function DriftingCD() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <g className="disc">
        <circle cx="32" cy="32" r="26" fill="#d4d4de" />
        <path d="M32 6 A26 26 0 0 1 54 20" stroke="#aac4f0" strokeWidth="5" fill="none" opacity="0.8" />
        <path d="M32 58 A26 26 0 0 1 10 44" stroke="#f0b8d8" strokeWidth="5" fill="none" opacity="0.8" />
        <circle cx="32" cy="32" r="8" fill="#f4f4f8" />
        <circle cx="32" cy="32" r="3.5" fill="#222230" />
      </g>
    </svg>
  );
}

interface Sprite {
  kind: 'floppy' | 'cd';
  top: number; // vh
  left: number; // vw
  dur: number;
  delay: number;
  scale: number;
}

function makeSprites(): Sprite[] {
  const sprites: Sprite[] = [];
  for (let i = 0; i < 22; i++) {
    // Spawn along a band across the top and right edges so the diagonal
    // stream covers the whole screen; negative delays start mid-flight.
    sprites.push({
      kind: i % 3 === 2 ? 'cd' : 'floppy',
      top: Math.random() * 160 - 70,
      left: Math.random() * 150,
      dur: 16 + Math.random() * 14,
      delay: -Math.random() * 30,
      scale: 0.45 + Math.random() * 0.85,
    });
  }
  return sprites;
}

export function Screensaver() {
  const sprites = useMemo(makeSprites, []);
  return (
    <Black aria-label="Screen saver — press any key or move the mouse">
      {sprites.map((s, i) => (
        <Flyer
          key={i}
          $dur={s.dur}
          $delay={s.delay}
          $scale={s.scale}
          style={{ top: `${s.top}vh`, left: `${s.left}vw` }}
        >
          {s.kind === 'floppy' ? <WingedFloppy /> : <DriftingCD />}
        </Flyer>
      ))}
    </Black>
  );
}
