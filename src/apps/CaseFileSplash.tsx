/**
 * Case Files startup splash — shown by the OS *before* the window opens
 * (registry `splash`, same mechanism as NetVoyager's). County-issue all the
 * way: the seal, the black->teal band, install-speak staging lines. Pure
 * chrome — no story text lives here. Click skips.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import sealArt from '../assets/images/sheriff-seal.png';

const SplashOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 95000;
`;

const SplashPanel = styled.div`
  width: 430px;
  background: linear-gradient(160deg, #000000 0%, #0b2f33 55%, #14636a 100%);
  color: #fff;
  border: 2px outset #9aa;
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
  padding: 24px 26px 12px;
  cursor: var(--cursor-arrow);
  font-family: Arial, Helvetica, sans-serif;
`;

const SPLASH_LINES = [
  'Verifying workstation credentials...',
  'Reading evidence index...',
  'Checking case server connection...',
  'Loading assigned case...',
];

export function CaseFileSplash({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= SPLASH_LINES.length) {
      const t = window.setTimeout(onDone, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 420);
    return () => window.clearTimeout(t);
  }, [step, onDone]);

  return (
    <SplashOverlay onClick={onDone}>
      <SplashPanel>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <img
            src={sealArt}
            alt=""
            style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
          />
          <div>
            <div style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: 4 }}>CASE FILES</div>
            <div style={{ fontSize: 12, letterSpacing: 2, marginTop: 3, color: '#cfe3e0' }}>
              EVIDENCE REVIEW WORKSTATION 1.2
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: '#9dc3bd', minHeight: 16 }}>
          {SPLASH_LINES[Math.min(step, SPLASH_LINES.length - 1)]}
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.25)',
            fontSize: 10.5,
            color: '#8fb0ab',
          }}
        >
          Humble County Sheriff&#39;s Office — Records Division.
          <br />
          For authorized use only. All activity on this workstation is logged.
        </div>
      </SplashPanel>
    </SplashOverlay>
  );
}
