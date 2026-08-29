/**
 * NetVoyager startup splash — shown by the OS *before* the browser window
 * opens (see windowStore pendingLaunch). Original branding throughout.
 */
import { useEffect, useId, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

// The mark: a little ship under a night sky — its two sails echo the old "V".
// When `sailing`, the waves scroll and the hull bobs, frame-stepped like a
// period animated-GIF throbber.

const waveScroll = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-16px); }
`;

const shipBob = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1.4px); }
`;

const LogoSvg = styled.svg<{ $sailing: boolean }>`
  display: block;
  .waves {
    ${(p) =>
      p.$sailing &&
      css`
        animation: ${waveScroll} 1.4s steps(7) infinite;
      `}
  }
  .ship {
    ${(p) =>
      p.$sailing &&
      css`
        animation: ${shipBob} 1.1s steps(2, jump-none) infinite;
      `}
  }
`;

export function VoyagerLogo({ size = 32, sailing = false }: { size?: number; sailing?: boolean }) {
  const clipId = useId();
  return (
    <LogoSvg width={size} height={size} viewBox="0 0 32 32" $sailing={sailing} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect width="32" height="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* night sky */}
        <rect width="32" height="32" fill="#000033" />
        <circle cx="6" cy="7" r="1" fill="#ffffff" />
        <circle cx="12" cy="4" r="0.7" fill="#aaccff" />
        <circle cx="27" cy="12" r="0.8" fill="#ffffff" />
        {/* the guiding star */}
        <path d="M25 4 L25.8 6.2 L28 7 L25.8 7.8 L25 10 L24.2 7.8 L22 7 L24.2 6.2 Z" fill="#f4ecc8" />
        {/* water */}
        <rect y="23.5" width="32" height="8.5" fill="#001a4d" />
        <g className="waves">
          <path
            d="M0 25 L3 23.8 L6 25 L9 23.8 L12 25 L15 23.8 L18 25 L21 23.8 L24 25 L27 23.8 L30 25 L33 23.8 L36 25 L39 23.8 L42 25 L45 23.8 L48 25"
            stroke="#3355aa"
            strokeWidth="0.8"
            fill="none"
          />
          <path
            d="M-2 28.5 L1 27.5 L4 28.5 L7 27.5 L10 28.5 L13 27.5 L16 28.5 L19 27.5 L22 28.5 L25 27.5 L28 28.5 L31 27.5 L34 28.5 L37 27.5 L40 28.5 L43 27.5 L46 28.5"
            stroke="#22447a"
            strokeWidth="0.8"
            fill="none"
          />
        </g>
        {/* the ship */}
        <g className="ship">
          <polygon points="16,4.5 21,6 16,7.5" fill="#c0392b" />
          <rect x="15.4" y="5.5" width="1.2" height="16.5" fill="#c8c8dd" />
          <polygon points="17.6,8 25,20.5 17.6,20.5" fill="#e8e8ff" />
          <polygon points="14.4,10 8,20.5 14.4,20.5" fill="#8fb0e8" />
          <polygon points="6.5,22 25.5,22 21.5,26.5 10.5,26.5" fill="#20203a" stroke="#8fb0e8" strokeWidth="0.6" />
        </g>
      </g>
    </LogoSvg>
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
          <VoyagerLogo size={84} sailing />
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
