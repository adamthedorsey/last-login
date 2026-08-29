/**
 * Casey's screen saver — the one SHE configured: her name in pink, bouncing
 * around the dark with a heart and a little star, corner to corner, forever.
 *
 * Constant-velocity linear motion with edge bounces (the classic bouncing-
 * logo saver). No easing.
 */
import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Black = styled.div`
  position: fixed;
  inset: 0;
  background: #0a000a;
  z-index: 100010;
  overflow: hidden;
  cursor: none;
`;

const Bouncer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
`;

const NamePlate = styled.div`
  font-family: 'Comic Sans MS', 'Segoe Print', cursive;
  font-size: 64px;
  font-weight: bold;
  color: #ff7ad9;
  text-shadow:
    3px 3px 0 #7a1055,
    -1px -1px 0 #ffc4ec;
  white-space: nowrap;
  user-select: none;
`;

function Heart({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 28 C6 20 2 14 2 9.5 C2 5.9 4.9 3 8.5 3 C11.4 3 14.2 4.8 16 7.6 C17.8 4.8 20.6 3 23.5 3 C27.1 3 30 5.9 30 9.5 C30 14 26 20 16 28 Z"
        fill="#ff4fa0"
        stroke="#8a1055"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="9" r="2.4" fill="#ffb6de" />
    </svg>
  );
}

function Star({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 2 L19 12 L30 12 L21 18.5 L24.5 29 L16 22.5 L7.5 29 L11 18.5 L2 12 L13 12 Z"
        fill="#ffd0f0"
        stroke="#c76c9e"
        strokeWidth="1.5"
      />
    </svg>
  );
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// px/second; signs randomized at mount.
const SPEEDS = [130, 95, 165];

export function Screensaver() {
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const bodies = useRef<Body[]>([]);

  useEffect(() => {
    bodies.current = SPEEDS.map((speed) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * (window.innerWidth - 300) + 40,
        y: Math.random() * (window.innerHeight - 200) + 40,
        vx: Math.abs(Math.cos(angle) * speed) * (Math.random() < 0.5 ? -1 : 1) || speed * 0.7,
        vy: Math.abs(Math.sin(angle) * speed) * (Math.random() < 0.5 ? -1 : 1) || speed * 0.7,
      };
    });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      bodies.current.forEach((b, i) => {
        const el = refs[i].current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x <= 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        } else if (b.x + w >= window.innerWidth) {
          b.x = window.innerWidth - w;
          b.vx = -Math.abs(b.vx);
        }
        if (b.y <= 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        } else if (b.y + h >= window.innerHeight) {
          b.y = window.innerHeight - h;
          b.vy = -Math.abs(b.vy);
        }
        el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Black aria-label="Screen saver — press any key or move the mouse">
      <Bouncer ref={refs[0]}>
        <NamePlate>✿ casey ✿</NamePlate>
      </Bouncer>
      <Bouncer ref={refs[1]}>
        <Heart />
      </Bouncer>
      <Bouncer ref={refs[2]}>
        <Star />
      </Bouncer>
    </Black>
  );
}
