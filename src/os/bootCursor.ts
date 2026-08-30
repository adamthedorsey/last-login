/**
 * The Win95 boot flicker: while the machine "thinks", the pointer flips
 * between busy, half-busy and idle on an uneven clock — pure theater, and
 * one of the most recognizable tells of a 1995-era boot. Stepped, never
 * animated; the schedule is deliberately irregular.
 */
import { useEffect, useState } from 'react';

const SCHEDULE: Array<[cursor: string, holdMs: number]> = [
  ['var(--cursor-wait)', 850],
  ['var(--cursor-arrow)', 250],
  ['var(--cursor-wait)', 1200],
  ['var(--cursor-appstarting)', 650],
  ['var(--cursor-arrow)', 200],
  ['var(--cursor-appstarting)', 950],
  ['var(--cursor-wait)', 550],
  ['var(--cursor-arrow)', 300],
];

/** Returns the cursor CSS value for a loading surface; cycles while active. */
export function useBootCursor(active: boolean): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(
      () => setIdx((i) => (i + 1) % SCHEDULE.length),
      SCHEDULE[idx][1],
    );
    return () => window.clearTimeout(t);
  }, [active, idx]);
  return active ? SCHEDULE[idx][0] : 'var(--cursor-arrow)';
}
