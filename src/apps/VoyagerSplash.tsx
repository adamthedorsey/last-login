/**
 * NetVoyager startup splash — shown by the OS *before* the browser window
 * opens (see windowStore pendingLaunch). Original branding throughout.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { READABLE_TEXT } from '../theme';

export function VoyagerLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }} aria-hidden>
      <rect width="32" height="32" fill="#000033" />
      <rect y="20" width="32" height="12" fill="#001a4d" />
      <circle cx="7" cy="6" r="1" fill="#ffffff" />
      <circle cx="25" cy="4" r="1" fill="#aaccff" />
      <circle cx="20" cy="10" r="0.8" fill="#ffffff" />
      <path d="M6 6 L13 26 L16 26 L10 6 Z" fill="#e8e8ff" />
      <path d="M22 6 L16 26 L13 26 L19 6 Z" fill="#8fb0e8" />
      <rect y="20" width="32" height="1.5" fill="#3355aa" />
    </svg>
  );
}

const SplashOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 95000;
`;

const SplashPanel = styled.div`
  width: 440px;
  background: linear-gradient(160deg, #000022 0%, #001a4d 60%, #003366 100%);
  color: #fff;
  border: 2px outset #aab;
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
  padding: 26px 28px 14px;
  cursor: pointer;
  font-family: 'Times New Roman', serif;
  ${READABLE_TEXT}
`;

const SPLASH_LINES = [
  'Initializing network libraries...',
  'Checking system configuration...',
  'Loading plug-ins...',
  'Starting Kava™...',
  'Welcome aboard.',
];

export function VoyagerSplash({ onDone }: { onDone: () => void }) {
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
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <VoyagerLogo size={84} />
          <div>
            <div style={{ fontSize: 30, fontStyle: 'italic', letterSpacing: 1 }}>
              NetVoyager<span style={{ fontSize: 14, verticalAlign: 'super' }}>®</span>
            </div>
            <div style={{ fontSize: 17, letterSpacing: 3, marginTop: 2 }}>COMMUNICATOR 3.0</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            color: '#aaccee',
            minHeight: 16,
          }}
        >
          {SPLASH_LINES[Math.min(step, SPLASH_LINES.length - 1)]}
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 8,
            borderTop: '1px solid #335',
            fontFamily: 'Arial, sans-serif',
            fontSize: 10.5,
            color: '#8899bb',
          }}
        >
          Copyright © 1994-1997 Voyager Communications Corporation. All rights reserved.
          <br />
          This software travels the World Wide Web. The Web does not travel back.
        </div>
      </SplashPanel>
    </SplashOverlay>
  );
}
