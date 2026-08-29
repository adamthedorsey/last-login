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
import { Button, Frame, TextInput } from 'react95';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import { playDialup, playError } from '../os/sounds';
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
`;

// The classic staging. Short enough to stay fun; a click skips ahead.
const STAGES = [
  { text: 'Dialing 555-0134 ...', ms: 1100 },
  { text: 'Connecting ...', ms: 1200 },
  { text: 'Verifying user name and password ...', ms: 1100 },
  { text: 'Connected at 33,600 bps.', ms: 700 },
];

export function DialUp({ windowId }: AppWindowProps) {
  const { send, view, refreshView } = useGame();
  const close = useWindowStore((s) => s.close);
  const [phase, setPhase] = useState<'idle' | 'dialing' | 'done'>('idle');
  const [stage, setStage] = useState(0);
  const timers = useRef<number[]>([]);

  const online = view?.online === true;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const finishConnect = async () => {
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

  const startDialing = () => {
    setPhase('dialing');
    setStage(0);
    playDialup();
    let at = 0;
    STAGES.forEach((_stage, i) => {
      at += i === 0 ? 0 : STAGES[i - 1].ms;
      timers.current.push(window.setTimeout(() => setStage(i), at));
    });
    timers.current.push(
      window.setTimeout(() => void finishConnect(), at + STAGES[STAGES.length - 1].ms),
    );
  };

  const skip = () => {
    if (phase !== 'dialing') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setStage(STAGES.length - 1);
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
          <p style={{ margin: 0 }}>
            Connected to <b>WestWind Online</b> at 33,600 bps.
          </p>
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
    <div style={{ fontSize: 13 }} onClick={skip}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
        <Icon name="dialup" size={32} />
        <b>Connect To: WestWind Online</b>
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
          {STAGES.slice(0, stage + 1).map((s) => (
            <div key={s.text}>{s.text}</div>
          ))}
        </StatusWell>
      ) : null}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
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
