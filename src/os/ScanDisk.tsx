/**
 * The automatic ScanDisk pass a 1995-era machine ran on the first boot after
 * losing power. Blue screen, checklist, stepped progress — no easing, ever.
 * All text here is generic OS chrome; the improper-shutdown STORY stamp
 * lives in the server-sent POST warning, not here.
 */
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { PIXEL_MONO } from '../theme';

const Screen = styled.div`
  height: 100vh;
  background: #0000a8;
  color: #c0c0c0;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  padding: 48px 64px;
  white-space: pre-wrap;
  cursor: var(--cursor-arrow);
`;

const Title = styled.div`
  background: #c0c0c0;
  color: #0000a8;
  display: inline-block;
  padding: 0 12px;
  margin-bottom: 24px;
`;

const AREAS = [
  'Media descriptor',
  'File allocation tables',
  'Directory structure',
  'File system',
  'Surface scan',
];

// One flat schedule: (percent, hold ms) — uneven, machine-like.
const STEPS: Array<[number, number]> = [
  [0, 500], [4, 300], [9, 250], [11, 700], [18, 300], [24, 250],
  [31, 350], [33, 900], [40, 250], [47, 300], [52, 250], [58, 650],
  [63, 300], [71, 250], [74, 800], [82, 300], [88, 250], [93, 400],
  [97, 350], [100, 900],
];

const BAR_CELLS = 40;

export function ScanDisk({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) {
      const t = window.setTimeout(onDone, 2200);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      if (step + 1 >= STEPS.length) setFinished(true);
      else setStep(step + 1);
    }, STEPS[step][1]);
    return () => window.clearTimeout(t);
  }, [step, finished, onDone]);

  const pct = STEPS[Math.min(step, STEPS.length - 1)][0];
  const areaIdx = Math.min(Math.floor(pct / (100 / AREAS.length)), AREAS.length - 1);
  const bar = useMemo(() => {
    const full = Math.round((pct / 100) * BAR_CELLS);
    return '█'.repeat(full) + '░'.repeat(BAR_CELLS - full);
  }, [pct]);

  const skip = () => {
    if (finished) onDone();
    else setFinished(true);
  };

  return (
    <Screen onClick={skip}>
      <Title>Microtech ScanDisk</Title>
      {'\n'}
      {'Because this computer was not properly shut down, one or more of\n'}
      {'your drives may have errors on it.\n\n'}
      {'ScanDisk is now checking drive C for errors:\n\n'}
      {AREAS.map(
        (a, i) =>
          `  ${finished || i < areaIdx ? '[»]' : i === areaIdx ? '[·]' : '[ ]'} ${a}\n`,
      ).join('')}
      {'\n'}
      {`  ${bar}\n`}
      {`  ${finished ? 100 : pct}% complete\n\n`}
      {finished
        ? 'ScanDisk found and fixed 1 lost file fragment.\n\nThe fragment was saved to the root of drive C.'
        : ''}
    </Screen>
  );
}
