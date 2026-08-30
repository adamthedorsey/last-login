import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { playError, playStartup } from './sounds';
import { ScanDisk } from './ScanDisk';
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

// The one sanctioned blink: a DOS block cursor, snapping — never fading.
const Cursor = styled.span`
  animation: boot-blink 0.9s steps(1) infinite;
  @keyframes boot-blink {
    50% {
      opacity: 0;
    }
  }
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

const HintLine = styled.div`
  margin-top: 10px;
  font-size: 13px;
  color: #444;
  b {
    font-weight: bold;
  }
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

// The POST, frame by frame. Real 1997 boots were slow and UNEVEN: the memory
// test counted up, IDE detection hung for a beat, then lines snapped in.
// Every frame is the full screen text plus how long to hold it — one flat
// schedule keeps the timing deterministic and the whole thing click-skippable.
interface BootFrame {
  text: string;
  ms: number;
}

function buildBootFrames(warning?: string[]): BootFrame[] {
  const frames: BootFrame[] = [];
  let cur = '';
  const hold = (ms: number) => frames.push({ text: cur, ms });
  const line = (text: string, ms: number) => {
    cur = cur ? `${cur}\n${text}` : text;
    hold(ms);
  };
  const append = (text: string, ms: number) => {
    cur += text;
    hold(ms);
  };

  line('Microtech BIOS v2.11  (C) 1996 Microtech Systems', 600);
  line('CPU Type: MT-586, 133 MHz', 450);
  line('Memory Test: 0 KB', 55);
  for (let kb = 2048; kb <= 32768; kb += 2048) {
    cur = cur.replace(/Memory Test: \d+ KB$/, `Memory Test: ${kb} KB`);
    hold(55);
  }
  append(' ......... OK', 550);
  line('', 150);
  line('Detecting IDE devices ...', 1100);
  append(' 1 fixed disk, 1 CD-ROM', 500);
  line('Mouse initialized on COM1', 450);
  // Server-sent story lines (e.g. the improper-shutdown stamp). The wording
  // of the warning — and its timestamp — belongs to the season content. The
  // actual disk check happens next, as a real ScanDisk pass.
  if (warning && warning.length > 0) {
    line('', 400);
    for (const w of warning) line(w, 800);
  }
  line('', 300);
  line('Starting Microtech Horizons 95 ...', 1700);
  return frames;
}

export function BootSequence({ onResume }: { onResume?: () => void } = {}) {
  const { view, send } = useGame();
  // "Log on as a different user" skips the POST — the machine never turned
  // off. (Read without consuming; cleared once on mount for StrictMode.)
  const [phase, setPhase] = useState<'boot' | 'scandisk' | 'login'>(() =>
    sessionStorage.getItem('lastlogin.logoff') === '1' ? 'login' : 'boot',
  );
  useEffect(() => {
    sessionStorage.removeItem('lastlogin.logoff');
  }, []);
  const [frameIdx, setFrameIdx] = useState(0);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  // The owner's password hint, revealed by the server after failed attempts
  // (view.loginHint covers a reload after it was already earned).
  const [hint, setHint] = useState<string | null>(null);
  // An active freeze survives reloads: the state view carries the remaining
  // seconds, so the form arrives already locked and counting down.
  const [lockSeconds, setLockSeconds] = useState(() => view?.loginLockSeconds ?? 0);

  // The freeze: while locked, count the seconds down on screen.
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = window.setTimeout(() => {
      setLockSeconds((s) => s - 1);
      if (lockSeconds === 1) setMessage(null);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [lockSeconds]);

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

  // The frame schedule includes any server-sent boot warning (story data —
  // the view is already loaded by the time this component mounts).
  const frames = useMemo(() => buildBootFrames(view?.bootWarning), [view]);

  useEffect(() => {
    if (phase !== 'boot' || !fontsReady) return;
    if (frameIdx >= frames.length) {
      const t = window.setTimeout(() => {
        // A cold boot after the improper shutdown runs ScanDisk, exactly like
        // 1995 did. A warm restart was a CLEAN shutdown, so it skips straight
        // through and resumes the session.
        if (view?.bootWarning?.length && !onResume) setPhase('scandisk');
        else if (view?.loggedIn && onResume) onResume();
        else setPhase('login');
      }, 400);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setFrameIdx((i) => i + 1), frames[frameIdx].ms);
    return () => window.clearTimeout(t);
  }, [phase, frameIdx, fontsReady, frames, view, onResume]);

  const done = frameIdx >= frames.length;
  const bootText = useMemo(
    () => frames[Math.min(frameIdx, frames.length - 1)].text,
    [frames, frameIdx],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password || lockSeconds > 0) return;
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
      if (res.hint) setHint(res.hint);
      if (res.lockedOut) {
        setLockSeconds(res.retryAfterSeconds ?? 90);
        setMessage('Too many incorrect attempts.');
      } else {
        setMessage('The password is incorrect. Please try again.');
      }
    } else {
      setMessage('The system did not respond. Try again.');
    }
  };

  const locked = lockSeconds > 0;
  const lockClock = `${Math.floor(lockSeconds / 60)}:${String(lockSeconds % 60).padStart(2, '0')}`;
  const shownHint = hint ?? view?.loginHint ?? null;

  if (phase === 'boot') {
    return (
      <BootScreen onClick={() => setFrameIdx(frames.length)}>
        {bootText}
        {!done && (
          <>
            {'\n'}
            <Cursor>█</Cursor>
          </>
        )}
      </BootScreen>
    );
  }

  if (phase === 'scandisk') {
    return <ScanDisk onDone={() => setPhase('login')} />;
  }

  return (
    <LoginBackdrop>
      <Brand>
        <h1>Microtech Horizons 95</h1>
        <p>Your world. Your desktop.</p>
      </Brand>
      <Window style={{ width: 380 }}>
        <WindowHeader>Welcome to Horizons 95</WindowHeader>
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
                disabled={locked}
                autoFocus
              />
            </Row>
            {shownHint && (
              <HintLine>
                Password hint (typed by {view?.loginUser ?? 'the owner'}): <b>{shownHint}</b>
              </HintLine>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={busy || locked} style={{ width: 90 }}>
                OK
              </Button>
            </div>
          </form>
          {(message || locked) && (
            <Frame variant="well" style={{ marginTop: 12, padding: '6px 8px', width: '100%' }}>
              {message}
              {locked && ` This computer is locked. Try again in ${lockClock}.`}
            </Frame>
          )}
        </WindowContent>
      </Window>
    </LoginBackdrop>
  );
}
