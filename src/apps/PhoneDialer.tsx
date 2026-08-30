/**
 * Phone Dialer — the accessory nobody used until they needed it. It shares
 * ONE phone line with the modem: dial while online and there's no dial tone.
 * Every number's outcome is served by the engine; the client only performs
 * the call (DTMF chirps, ring cadence, and whatever the line says back).
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput } from 'react95';
import { useGame } from '../game/gameContext';
import { playBusy, playDialup, playDtmf, playError, playRing } from '../os/sounds';

const Pad = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 44px);
  gap: 4px;
`;

const StatusWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 8px;
  padding: 6px 8px;
  font-size: 13px;
  line-height: 1.5;
  min-height: 76px;
  white-space: pre-wrap;
`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

interface SpeedEntry {
  label: string;
  number: string;
}

/** 5550119 -> 555-0119, for the display field. */
function prettyNumber(digits: string): string {
  return digits.length === 7 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

export function PhoneDialer() {
  const { send } = useGame();
  const [number, setNumber] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [calling, setCalling] = useState(false);
  const [speed, setSpeed] = useState<SpeedEntry[]>([]);
  const callSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'getSpeedDial' }).then((res) => {
      if (!cancelled && res.type === 'speedDial') setSpeed(res.entries);
    });
    return () => {
      cancelled = true;
    };
  }, [send]);

  const press = (key: string) => {
    if (calling) return;
    playDtmf(key);
    setNumber((n) => (n.length < 16 ? n + key : n));
  };

  const dial = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (calling || !digits) return;
    const seq = ++callSeq.current;
    setCalling(true);
    setLines([]);
    // Punch the number in.
    digits.split('').forEach((d, i) => playDtmf(d, i * 110));
    await sleep(digits.length * 110 + 500);
    if (callSeq.current !== seq) return;
    setLines([`Dialing ${prettyNumber(digits)} ...`]);
    const res = await send({ type: 'dial', number: digits });
    if (callSeq.current !== seq) return;
    if (res.type !== 'dial') {
      setCalling(false);
      return;
    }
    if (res.lineBusy) {
      playError();
      setLines((p) => [
        ...p,
        'There is no dial tone. The phone line is in use by Dial-Up Networking.',
      ]);
      setCalling(false);
      return;
    }
    if (res.outcome === 'busy') {
      await sleep(700);
      playBusy();
      setLines((p) => [...p, 'The line is busy.']);
    } else if (res.outcome === 'message') {
      playRing();
      await sleep(2000);
      if (callSeq.current !== seq) return;
      if (res.carrier) playDialup();
      for (const line of res.message ?? []) {
        setLines((p) => [...p, line]);
        await sleep(900);
        if (callSeq.current !== seq) return;
      }
    } else {
      playRing();
      playRing(2400);
      await sleep(4800);
      if (callSeq.current !== seq) return;
      setLines((p) => [...p, 'There is no answer.']);
    }
    setCalling(false);
  };

  const hangUp = () => {
    callSeq.current += 1;
    setCalling(false);
    setLines((p) => [...p, 'Call ended.']);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <u>N</u>umber to dial:
          </div>
          <TextInput
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void dial(number);
            }}
            disabled={calling}
            style={{ width: 148, marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Button onClick={() => void dial(number)} disabled={calling} style={{ width: 70 }}>
              Dial
            </Button>
            <Button onClick={hangUp} disabled={!calling} style={{ width: 72 }}>
              Hang Up
            </Button>
          </div>
          <Pad>
            {KEYS.map((k) => (
              <Button key={k} onClick={() => press(k)} style={{ height: 32 }}>
                {k}
              </Button>
            ))}
          </Pad>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Speed dial</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const entry = speed[i];
              return (
                <Button
                  key={i}
                  disabled={!entry || calling}
                  onClick={
                    entry
                      ? () => {
                          setNumber(prettyNumber(entry.number));
                          void dial(entry.number);
                        }
                      : undefined
                  }
                  style={{ justifyContent: 'flex-start', paddingLeft: 10 }}
                >
                  {entry ? `${i + 1}  ${entry.label}` : `${i + 1}`}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      <StatusWell>{lines.join('\n')}</StatusWell>
    </>
  );
}
