/**
 * The remote-access takeover: the GUI drops and someone else's session
 * plays out on the screen. EVERY line comes from the engine
 * (getRemoteSession) — no story text lives here. Rendering is stepped on
 * fixed clocks (per-character for typed commands, per-line for output);
 * a click or key skips to the end. Acknowledging with remoteSessionDone
 * applies the story effects server-side and drops the connection.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  color: #b8b8b8;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  line-height: 1.2;
  padding: 8px 10px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  z-index: 100008;
  cursor: var(--cursor-arrow);
`;

const Cursor = styled.span`
  animation: remote-blink 0.9s steps(1) infinite;
  @keyframes remote-blink {
    50% {
      opacity: 0;
    }
  }
`;

const CHAR_MS = 45; // remote keystrokes, constant velocity
const LINE_MS = 90; // output lines
const SYS_MS = 70; // banner lines

export function RemoteSession() {
  const { send, refreshView } = useGame();
  const [lines, setLines] = useState<string[]>([]);
  const [cur, setCur] = useState<string | null>(null);
  const skipRef = useRef(false);
  const doneRef = useRef(false);
  const startedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines, cur]);

  useEffect(() => {
    // StrictMode double-mounts effects; the playback must run once.
    if (startedRef.current) return;
    startedRef.current = true;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const started = performance.now();
        const tick = window.setInterval(() => {
          if (skipRef.current || performance.now() - started >= ms) {
            window.clearInterval(tick);
            resolve();
          }
        }, 40);
      });

    const finish = async () => {
      if (doneRef.current) return;
      doneRef.current = true;
      await send({ type: 'remoteSessionDone' });
      // remotePending clears (and the line is down); the shell re-renders.
      await refreshView();
    };

    void (async () => {
      const res = await send({ type: 'getRemoteSession' });
      if (res.type !== 'remote' || !res.ok || !res.script) {
        await finish();
        return;
      }
      for (const line of res.script) {
        if (skipRef.current) break;
        switch (line.t) {
          case 'pause':
            await sleep(line.ms);
            break;
          case 'sys':
            setLines((p) => [...p, line.text]);
            await sleep(SYS_MS);
            break;
          case 'out':
            for (const l of line.lines) {
              if (skipRef.current) break;
              setLines((p) => [...p, l]);
              await sleep(LINE_MS);
            }
            break;
          case 'cmd': {
            for (let i = 1; i <= line.text.length; i++) {
              if (skipRef.current) break;
              setCur(line.text.slice(0, i));
              await sleep(CHAR_MS);
            }
            setCur(null);
            setLines((p) => [...p, line.text]);
            await sleep(260);
            break;
          }
        }
      }
      await finish();
    })();
  }, [send, refreshView]);

  // Any input skips to the end — deliberate slowness stays skippable. A
  // short grace period (same trick as the screen saver) stops the click
  // the player was mid-way through when the screen dropped from skipping
  // the whole thing instantly.
  useEffect(() => {
    const armedAt = performance.now();
    const skip = () => {
      if (performance.now() - armedAt < 600) return;
      skipRef.current = true;
    };
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    return () => {
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', skip, true);
    };
  }, []);

  return (
    <Screen>
      {lines.join('\n')}
      {lines.length > 0 ? '\n' : ''}
      {cur !== null && (
        <>
          {cur}
          <Cursor>█</Cursor>
        </>
      )}
      <div ref={bottomRef} />
    </Screen>
  );
}
