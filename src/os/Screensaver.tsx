/**
 * The screen saver Casey configured: the classic starfield warp (a Win95
 * staple) with her chosen text floating pink at the center.
 *
 * The word comes from server content (view.saverText) — it is story data,
 * and it has been glowing on this idle screen every night for anyone in the
 * house to see. Constant-velocity motion only.
 */
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useGame } from '../game/gameContext';

const Black = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 100010;
  overflow: hidden;
  cursor: none;
`;

const Word = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Comic Sans MS', 'Segoe Print', cursive;
  font-size: 58px;
  font-weight: bold;
  color: #ff7ad9;
  text-shadow:
    0 0 12px #a1206b,
    3px 3px 0 #57103c;
  user-select: none;
  white-space: nowrap;
`;

interface Star {
  x: number; // -1..1 in view space
  y: number;
  z: number; // depth: 1 (far) -> 0 (at the glass)
}

const STAR_COUNT = 240;
const SPEED = 0.28; // z units per second — constant, no easing

function spawn(): Star {
  return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: 0.15 + Math.random() * 0.85 };
}

export function Screensaver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { view } = useGame();
  const word = view?.saverText;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars: Star[] = Array.from({ length: STAR_COUNT }, spawn);
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.max(w, h) * 0.5;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        const pz = s.z;
        s.z -= SPEED * dt;
        if (s.z <= 0.02) {
          Object.assign(s, spawn(), { z: 1 });
          continue;
        }
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        if (sx < 0 || sx > w || sy < 0 || sy > h) {
          Object.assign(s, spawn(), { z: 1 });
          continue;
        }
        // Streak from previous depth to current — the warp look.
        const px = cx + (s.x / pz) * scale;
        const py = cy + (s.y / pz) * scale;
        const b = 1 - s.z; // nearer = brighter and thicker
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + b * 0.65})`;
        ctx.lineWidth = b * 2.2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <Black aria-label="Screen saver — press any key or move the mouse">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {word && <Word>{word}</Word>}
    </Black>
  );
}
