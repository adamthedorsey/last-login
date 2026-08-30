/**
 * The blue screen. Pure period flavor — no state is lost, nothing crashes.
 * It appears rarely (see DesktopShell's click counter), exactly the way a
 * real 1997 machine would remind you it was mortal. Any key continues.
 */
import { useEffect } from 'react';
import styled from 'styled-components';
import { PIXEL_MONO } from '../theme';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  background: #0000aa;
  color: #c0c0c0;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100010;
  cursor: var(--cursor-arrow);
`;

const Body = styled.div`
  max-width: 600px;
  white-space: pre-wrap;
`;

const Title = styled.span`
  background: #c0c0c0;
  color: #0000aa;
  padding: 0 8px;
`;

const Blink = styled.span`
  animation: bsod-blink 0.9s steps(1) infinite;
  @keyframes bsod-blink {
    50% {
      opacity: 0;
    }
  }
`;

export function Bsod({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      onDismiss();
    };
    const onDown = () => onDismiss();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onDismiss]);

  return (
    <Screen>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <Title>Horizons</Title>
      </div>
      <Body>
        {`An exception 0E has occurred at 0028:C0034B21 in VxD VMM(01) +
00010E36. The current application will be terminated.

*  Press any key to attempt to continue.
*  Press CTRL+ALT+DEL again to restart your computer. You will
   lose any unsaved information in all applications.
`}
      </Body>
      <div style={{ marginTop: 18 }}>
        Press any key to continue <Blink>█</Blink>
      </div>
    </Screen>
  );
}
