/**
 * PLAYER authentication (the real person's saved-progress account) — entirely
 * separate from the fictional in-game computer login, which is part of the story.
 * Dev-mode builds skip this (no Supabase needed).
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import type { Session } from '@supabase/supabase-js';
import { backendMode } from './game/client';

const Backdrop = styled.div`
  height: 100vh;
  background: #3a6ea5;
  display: flex;
  align-items: center;
  justify-content: center;
`;

function SupabaseAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let sub: { unsubscribe(): void } | null = null;
    void (async () => {
      const { supabase } = await import('./game/supabase');
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setChecked(true);
      const res = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
      sub = res.data.subscription;
    })();
    return () => sub?.unsubscribe();
  }, []);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { supabase } = await import('./game/supabase');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setStage('code');
      setMessage('Check your email for a 6-digit code.');
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { supabase } = await import('./game/supabase');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (error) setMessage(error.message);
  };

  const guest = async () => {
    setBusy(true);
    setMessage(null);
    const { supabase } = await import('./game/supabase');
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setMessage(`${error.message} (enable anonymous sign-ins in Supabase Auth settings)`);
  };

  if (!checked) return <Backdrop />;
  if (session) return <>{children}</>;

  return (
    <Backdrop>
      <Window style={{ width: 400 }}>
        <WindowHeader>Last Login — player sign-in</WindowHeader>
        <WindowContent>
          <p style={{ marginTop: 0, fontSize: 13 }}>
            Sign in so the machine remembers where you left off. This is <i>your</i> account — the
            computer you're about to open belongs to someone else.
          </p>
          {stage === 'email' ? (
            <form onSubmit={sendCode} style={{ display: 'flex', gap: 6 }}>
              <TextInput
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1 }}
                type="email"
              />
              <Button type="submit" disabled={busy || !email}>
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} style={{ display: 'flex', gap: 6 }}>
              <TextInput
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button type="submit" disabled={busy || code.length < 6}>
                Verify
              </Button>
            </form>
          )}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => void guest()} disabled={busy}>
              Play as guest
            </Button>
            {stage === 'code' && (
              <Button onClick={() => setStage('email')} disabled={busy}>
                Different email
              </Button>
            )}
          </div>
          {message && (
            <Frame variant="well" style={{ marginTop: 10, padding: '5px 8px', fontSize: 12, width: '100%' }}>
              {message}
            </Frame>
          )}
        </WindowContent>
      </Window>
    </Backdrop>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  if (backendMode() === 'dev') return <>{children}</>;
  return <SupabaseAuth>{children}</SupabaseAuth>;
}
