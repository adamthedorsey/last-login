/**
 * The thing Solitaire is a front for. The knock (see Solitaire.tsx) opens
 * this: a bare login on a black screen, nothing like the game that
 * spawned it. Credentials are checked by the ENGINE (a standalone
 * password target) so no secret lives client-side; what lies past a
 * correct login is server content, authored later. For now a correct
 * login lands on a "no channel configured" holding screen — machine
 * chrome, no story.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../game/gameContext';
import { topWindowId, useWindowStore } from '../os/windowStore';
import { PIXEL_MONO } from '../theme';
import type { AppWindowProps } from '../os/appRegistry';

const Screen = styled.div`
  flex: 1;
  min-height: 0;
  background: #000;
  color: #33ff66;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  line-height: 1.4;
  padding: 14px 16px;
  overflow: auto;
  cursor: var(--cursor-text);
  white-space: pre-wrap;
`;

const Field = styled.span`
  color: #b8ffcc;
`;

const Cursor = styled.span`
  animation: bd-blink 0.9s steps(1) infinite;
  @keyframes bd-blink {
    50% {
      opacity: 0;
    }
  }
`;

type Phase = 'user' | 'pass' | 'checking' | 'denied' | 'granted';

const BACKDOOR_TARGET = 'backdoor.sol';

export function SolBackdoor({ windowId }: AppWindowProps) {
  const { send } = useGame();
  const close = useWindowStore((s) => s.close);
  const [phase, setPhase] = useState<Phase>('user');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [note, setNote] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const focused = useWindowStore((s) => topWindowId(s.windows) === windowId);
  const active = (phase === 'user' || phase === 'pass') && focused;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const setter = phase === 'user' ? setUser : setPass;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'user') {
          if (user.trim()) setPhase('pass');
        } else {
          void attempt();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setter((v) => v.slice(0, -1));
        return;
      }
      if (e.key === 'Escape') {
        close(windowId);
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        setter((v) => (v.length < 40 ? v + e.key : v));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, user, pass, active]);

  const attempt = async () => {
    setPhase('checking');
    setNote('');
    const res = await send({ type: 'attemptPassword', targetId: BACKDOOR_TARGET, password: pass });
    if (res.type === 'password' && res.ok) {
      setPhase('granted');
    } else {
      setNote(
        res.type === 'password' && res.lockedOut
          ? 'Too many attempts. Locked.'
          : 'Access denied.',
      );
      setUser('');
      setPass('');
      setPhase('user');
    }
  };

  return (
    <Screen ref={rootRef} onClick={() => rootRef.current?.focus()}>
      {'\n'}
      {'  '}·· PORTHOLE ·· node up ··{'\n'}
      {'  authorized access only. all sessions are logged.\n\n'}
      {phase === 'granted' ? (
        <>
          {'  authenticated.\n\n'}
          {'  no channel is configured on this node.\n'}
          {'  nothing to send. nothing to receive.\n'}
        </>
      ) : (
        <>
          {'  login: '}
          <Field>{user}</Field>
          {phase === 'user' && <Cursor>_</Cursor>}
          {'\n'}
          {(phase === 'pass' || phase === 'checking' || phase === 'denied') && (
            <>
              {'  passwd: '}
              <Field>{'*'.repeat(pass.length)}</Field>
              {phase === 'pass' && <Cursor>_</Cursor>}
              {'\n'}
            </>
          )}
          {phase === 'checking' && '\n  checking...\n'}
          {note && `\n  ${note}\n`}
        </>
      )}
    </Screen>
  );
}
