import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { playError, playStartup } from './sounds';
import { PIXEL_MONO } from '../theme';

const BootScreen = styled.div`
  height: 100vh;
  background: #000;
  color: #b8b8b8;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  padding: 28px;
  white-space: pre-wrap;
  cursor: pointer;
`;

const LoginBackdrop = styled.div`
  height: 100vh;
  background: #008080;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 18px;
`;

const Brand = styled.div`
  color: #fff;
  text-align: center;
  h1 {
    font-size: 34px;
    margin: 0;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 #004040;
  }
  p {
    margin: 4px 0 0;
    opacity: 0.85;
    font-style: italic;
  }
`;

const StickyNote = styled.div`
  max-width: 300px;
  background: #fffa9d;
  color: #333;
  padding: 10px 12px;
  font-size: 13px;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35);
  transform: rotate(-1.6deg);
  font-family: 'Comic Sans MS', 'Segoe Print', cursive;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  label {
    width: 84px;
  }
`;

const BOOT_LINES = [
  'Microtech BIOS v2.11  (C) 1996 Microtech Systems',
  'Memory Test: 32768 KB ......... OK',
  'Detecting IDE devices ... 1 fixed disk, 1 CD-ROM',
  'Mouse initialized on COM1',
  '',
  'Starting Microtech Horizons 97 ...',
];

export function BootSequence() {
  const { view, send, client, refreshView } = useGame();
  const [phase, setPhase] = useState<'boot' | 'login'>('boot');
  const [lineCount, setLineCount] = useState(0);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  // The boot text is the first thing on screen — hold it (black screen, like a
  // monitor warming up) until the bitmap fonts have actually loaded, so the
  // BIOS text never flashes in a fallback font.
  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        setFontsReady(true);
      }
    };
    Promise.all([
      document.fonts.load('16px Fixedsys'),
      document.fonts.load('14px ms_sans_serif'),
    ]).then(finish, finish);
    const t = window.setTimeout(finish, 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'boot' || !fontsReady) return;
    if (lineCount >= BOOT_LINES.length) {
      const t = window.setTimeout(() => setPhase('login'), 700);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setLineCount((c) => c + 1), 260);
    return () => window.clearTimeout(t);
  }, [phase, lineCount, fontsReady]);

  const bootText = useMemo(() => BOOT_LINES.slice(0, lineCount).join('\n'), [lineCount]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setMessage(null);
    const res = await send({ type: 'login', password });
    setBusy(false);
    if (res.type === 'login') {
      if (res.ok) {
        playStartup();
        return; // view.loggedIn flips; App switches to the desktop
      }
      playError();
      setPassword('');
      setMessage(
        res.lockedOut
          ? 'Too many incorrect attempts. This account is temporarily locked.'
          : 'The password is incorrect. Please try again.',
      );
    } else {
      setMessage('The system did not respond. Try again.');
    }
  };

  const devSkip = async () => {
    if (!import.meta.env.DEV) return;
    // Dev builds only. Flips the flag through the dev adapter's state —
    // production clients have no such path and no password in reach.
    const mod = await import('../game/devGameClient');
    if (client instanceof mod.DevGameClient) {
      client.devMutate((s) => {
        s.loggedIn = true;
      });
      await refreshView();
    }
  };

  if (phase === 'boot') {
    return (
      <BootScreen onClick={() => setLineCount(BOOT_LINES.length)}>
        {bootText}
        {lineCount < BOOT_LINES.length ? '\n█' : ''}
      </BootScreen>
    );
  }

  return (
    <LoginBackdrop>
      <Brand>
        <h1>Microtech Horizons 97</h1>
        <p>Your world. Your desktop.</p>
      </Brand>
      <Window style={{ width: 380 }}>
        <WindowHeader>Welcome to Horizons 97</WindowHeader>
        <WindowContent>
          <div>Type a password to log on to this computer.</div>
          <form onSubmit={submit}>
            <Row>
              <label htmlFor="login-user">User name:</label>
              <TextInput id="login-user" value={view?.loginUser ?? 'casey'} readOnly style={{ flex: 1 }} />
            </Row>
            <Row>
              <label htmlFor="login-pass">Password:</label>
              <TextInput
                id="login-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
            </Row>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              {import.meta.env.DEV && (
                <Button type="button" onClick={() => void devSkip()}>
                  DEV: skip
                </Button>
              )}
              <Button type="submit" disabled={busy} style={{ width: 90 }}>
                OK
              </Button>
            </div>
          </form>
          {message && (
            <Frame variant="well" style={{ marginTop: 12, padding: '6px 8px', width: '100%' }}>
              {message}
            </Frame>
          )}
        </WindowContent>
      </Window>
      {view?.loginHint && <StickyNote>{view.loginHint}</StickyNote>}
    </LoginBackdrop>
  );
}
