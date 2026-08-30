/**
 * Dial-Up Networking — the door between the machine and the outside world.
 *
 * All of this is THEATER: the staged status lines and the modem noise are
 * client-side flavor. The actual state change is the server's `connect` /
 * `disconnect` action, and every application's behavior follows the
 * server's word (StateView.online), never a local flag.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Hourglass, TextInput } from 'react95';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import { playBusy, playError, startDialupSound, stopDialupSound } from '../os/sounds';
import { Icon } from '../os/icons';
import type { AppWindowProps } from '../os/appRegistry';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  label {
    width: 96px;
    font-size: 13px;
  }
`;

const StatusWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 10px;
  padding: 6px 8px;
  font-size: 13px;
  min-height: 44px;
  /* Whatever the staging prints, the buttons below never get pushed out. */
  flex: 0 1 auto;
  overflow-y: auto;
`;

// The staging is paced to the FULL handshake recording (~26s) — the whole
// point is the anticipation. A click still skips for impatient replays.
const STAGES = [
  { text: 'Dialing 555-0134 ...', ms: 5500 },
  { text: 'Connecting ...', ms: 13500 },
  { text: 'Verifying user name and password ...', ms: 5000 },
  { text: 'Connected at 33,600 bps.', ms: 2500 },
];

function fmtDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Ticks forward from the server-reported baseline; remounted (via key)
 * whenever the server refreshes its number. */
function Duration({ base }: { base: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <>Duration: {fmtDuration(base + tick)}</>;
}

export function DialUp({ windowId }: AppWindowProps) {
  const { send, view, refreshView } = useGame();
  const close = useWindowStore((s) => s.close);
  const [phase, setPhase] = useState<'idle' | 'dialing' | 'done'>('idle');
  const timers = useRef<number[]>([]);

  const online = view?.online === true;

  // The server's word on when the connection started; the client only
  // counts forward from it (see Duration).
  const baseline = view?.onlineSeconds ?? 0;

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopDialupSound();
    },
    [],
  );

  const finishConnect = async () => {
    stopDialupSound();
    const res = await send({ type: 'connect' });
    await refreshView();
    setPhase('done');
    if (res.type === 'net' && (res.newMail ?? 0) > 0) {
      // Let the player see it, then hand them back the desktop.
      timers.current.push(window.setTimeout(() => close(windowId), 1400));
    } else {
      timers.current.push(window.setTimeout(() => close(windowId), 900));
    }
  };

  const [lines, setLines] = useState<string[]>([]);

  const runStages = (schedule: Array<{ text: string; ms: number }>) => {
    let at = 0;
    schedule.forEach((st, i) => {
      at += i === 0 ? 0 : schedule[i - 1].ms;
      timers.current.push(window.setTimeout(() => setLines((l) => [...l, st.text]), at));
    });
    timers.current.push(
      window.setTimeout(() => void finishConnect(), at + schedule[schedule.length - 1].ms),
    );
  };

  const startDialing = () => {
    setPhase('dialing');
    setLines([]);
    // One line in a small town: sometimes the first dial hits a busy signal.
    if (Math.random() < 0.22) {
      playBusy();
      runStages([
        { text: 'Dialing 555-0134 ...', ms: 1500 },
        { text: 'The line is busy.', ms: 1400 },
        { text: 'Redialing (attempt 2) ...', ms: 500 },
        ...STAGES.map((st, i) => (i === 0 ? { ...st, text: 'Dialing 555-0134 ...' } : st)),
      ]);
      timers.current.push(window.setTimeout(() => startDialupSound(), 3400));
    } else {
      startDialupSound();
      runStages(STAGES);
    }
  };

  const skip = () => {
    if (phase !== 'dialing') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setLines((l) => [...l, STAGES[STAGES.length - 1].text]);
    void finishConnect();
  };

  const disconnect = async () => {
    const res = await send({ type: 'disconnect' });
    if (res.type !== 'net') playError();
    await refreshView();
    close(windowId);
  };

  if (online && phase === 'idle') {
    return (
      <div style={{ fontSize: 13 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 4 }}>
          <Icon name="dialup" size={32} />
          <div>
            <p style={{ margin: 0 }}>
              Connected to <b>WestWind Online</b> at 33,600 bps.
            </p>
            <p style={{ margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              <Duration key={baseline} base={baseline} />
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#555' }}>
              WestWind Standard Plan — your first 20 hours each month are
              free.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={() => void disconnect()} style={{ width: 110 }}>
            Disconnect
          </Button>
          <Button onClick={() => close(windowId)} style={{ width: 80 }}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ fontSize: 13, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      onClick={skip}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
        <Icon name="dialup" size={32} />
        <b>Connect To: WestWind Online</b>
        {phase === 'dialing' && (
          <span style={{ marginLeft: 'auto' }}>
            <Hourglass size={22} />
          </span>
        )}
      </div>
      <Row>
        <label htmlFor="du-user">User name:</label>
        <TextInput id="du-user" value="casey_t" readOnly style={{ flex: 1 }} />
      </Row>
      <Row>
        <label htmlFor="du-pass">Password:</label>
        <TextInput id="du-pass" type="password" value="********" readOnly style={{ flex: 1 }} />
      </Row>
      <Row>
        <label htmlFor="du-phone">Phone number:</label>
        <TextInput id="du-phone" value="555-0134" readOnly style={{ flex: 1 }} />
      </Row>
      {phase === 'dialing' || phase === 'done' ? (
        <StatusWell>
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </StatusWell>
      ) : null}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 14, flexShrink: 0 }}>
        <Button onClick={startDialing} disabled={phase !== 'idle'} style={{ width: 100 }}>
          Connect
        </Button>
        <Button onClick={() => close(windowId)} style={{ width: 80 }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
