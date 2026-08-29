import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import { useGame } from '../game/gameContext';

const Face = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

/**
 * The machine's clock. It shows the in-world time — which never advances.
 * The second hand tries. It always ends up back where it started.
 */
export function ClockApp() {
  const { view } = useGame();
  const now = useMemo(() => new Date(view?.clockNow ?? '1997-10-18T21:47:00'), [view?.clockNow]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => (v + 1) % 3), 1000);
    return () => window.clearInterval(t);
  }, []);

  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const hourAngle = (h + m / 60) * 30;
  const minAngle = m * 6;
  const secAngle = tick * 6; // 0 → 6 → 12 degrees, then back. Stuck, like everything here.

  const hand = (angle: number, len: number, width: number, color: string) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return (
      <line
        x1={70}
        y1={70}
        x2={70 + len * Math.cos(rad)}
        y2={70 + len * Math.sin(rad)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="square"
      />
    );
  };

  return (
    <Face>
      <svg width={140} height={140} shapeRendering="crispEdges" aria-label="Clock at 9:47 PM">
        <circle cx={70} cy={70} r={66} fill="#fff" stroke="#000" strokeWidth={3} />
        {Array.from({ length: 12 }, (_, i) => {
          const rad = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={70 + 56 * Math.cos(rad)}
              y1={70 + 56 * Math.sin(rad)}
              x2={70 + 62 * Math.cos(rad)}
              y2={70 + 62 * Math.sin(rad)}
              stroke="#000"
              strokeWidth={i % 3 === 0 ? 3 : 1}
            />
          );
        })}
        {hand(hourAngle, 34, 5, '#000')}
        {hand(minAngle, 50, 3, '#000')}
        {hand(secAngle + 282, 56, 1, '#a03020')}
        <circle cx={70} cy={70} r={4} fill="#000" />
      </svg>
      <Frame variant="field" style={{ padding: '4px 12px', fontFamily: "'Fixedsys', monospace", fontSize: 16 }}>
        9:47 PM — SAT OCT 18 1997
      </Frame>
      <div style={{ fontSize: 11, color: '#666' }}>clock battery may need replacement</div>
    </Face>
  );
}
