import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Toolbar } from 'react95';

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
];

const Swatch = styled.button<{ $color: string; $active: boolean }>`
  width: 20px;
  height: 20px;
  background: ${(p) => p.$color};
  border: 2px ${(p) => (p.$active ? 'inset #000' : 'outset #fff')};
  padding: 0;
  cursor: var(--cursor-arrow);
`;

const CanvasWell = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  background: #808080;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  canvas {
    background: #fff;
    cursor: crosshair;
    touch-action: none;
    image-rendering: pixelated;
  }
`;

export function Paintbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(2);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 440, 300);
    }
  }, []);

  const pos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const stroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = eraser ? '#ffffff' : color;
      ctx.lineWidth = eraser ? size * 4 : size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [color, size, eraser],
  );

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 440, 300);
    }
  };

  return (
    <>
      <Toolbar style={{ gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
        <Button active={!eraser} onClick={() => setEraser(false)}>✎ Pencil</Button>
        <Button active={eraser} onClick={() => setEraser(true)}>▭ Eraser</Button>
        {[1, 2, 5].map((s) => (
          <Button key={s} active={size === s} onClick={() => setSize(s)} style={{ width: 34 }}>
            {s === 1 ? '·' : s === 2 ? '•' : '●'}
          </Button>
        ))}
        <Button onClick={clear}>Clear</Button>
      </Toolbar>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', padding: '4px 0', flexShrink: 0 }}>
        {PALETTE.map((c) => (
          <Swatch
            key={c}
            $color={c}
            $active={color === c && !eraser}
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>
      <CanvasWell>
        <canvas
          ref={canvasRef}
          width={440}
          height={300}
          onPointerDown={(e) => {
            drawingRef.current = true;
            lastRef.current = pos(e);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            stroke(lastRef.current, lastRef.current);
          }}
          onPointerMove={(e) => {
            if (!drawingRef.current || !lastRef.current) return;
            const p = pos(e);
            stroke(lastRef.current, p);
            lastRef.current = p;
          }}
          onPointerUp={() => {
            drawingRef.current = false;
            lastRef.current = null;
          }}
        />
      </CanvasWell>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        Untitled — saving is not installed. Art is temporary. So is everything.
      </Frame>
    </>
  );
}
