/**
 * PLAYER authentication (the real person's saved-progress account) — entirely
 * separate from the fictional in-game computer login, which is part of the
 * story. Uses Supabase's built-in auth (GoTrue) directly.
 *
 * Flows: email + password sign-in, account creation, a one-time email code
 * (OTP) as an alternative, and password reset (request + the recovery
 * update form). Dev-mode builds skip all of this (no Supabase needed).
 *
 * Note on email delivery: signup logs the player in immediately (email
 * confirmations are off), so account creation needs no email. The email
 * CODE and the reset LINK do send mail — a fresh Supabase project's default
 * mailer only reaches your org's own addresses until custom SMTP is set up.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { backendMode } from './game/client';

const MIN_PASSWORD = 6; // matches supabase/config.toml auth.minimum_password_length

const Backdrop = styled.div`
  height: 100vh;
  background: #3a6ea5;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
  font-size: 12px;
`;

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 12px;
`;

/** A plain text button — the secondary "switch to another flow" actions. */
const TextLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: #00007f;
  text-decoration: underline;
  cursor: var(--cursor-hand, pointer);
  &:disabled {
    color: #7a7a7a;
    cursor: default;
  }
`;

type Mode = 'password' | 'signup' | 'otp-email' | 'otp-code' | 'reset-request' | 'reset-update';

const HEADERS: Record<Mode, string> = {
  password: 'Last Login — player sign-in',
  signup: 'Last Login — create account',
  'otp-email': 'Last Login — sign in with a code',
  'otp-code': 'Last Login — enter your code',
  'reset-request': 'Last Login — reset password',
  'reset-update': 'Last Login — set a new password',
};

function SupabaseAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  // A password-recovery link creates a session AND fires PASSWORD_RECOVERY.
  // While recovering we must show the update-password form even though a
  // session exists — otherwise the player would drop straight into the game
  // without ever setting the new password.
  const [recovering, setRecovering] = useState(false);

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let sub: { unsubscribe(): void } | null = null;
    void (async () => {
      const { supabase } = await import('./game/supabase');
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setChecked(true);
      sub = supabase.auth.onAuthStateChange((evt, s) => {
        setSession(s);
        if (evt === 'PASSWORD_RECOVERY') {
          setRecovering(true);
          setMode('reset-update');
          setMessage('Enter a new password for your account.');
        }
      }).data.subscription;
    })();
    return () => sub?.unsubscribe();
  }, []);

  const client = async (): Promise<SupabaseClient> => (await import('./game/supabase')).supabase;

  /** Wrap an auth call: manage busy/message, surface any error message. */
  const run = async (fn: (sb: SupabaseClient) => Promise<string | void>) => {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await fn(await client());
      if (typeof ok === 'string') setMessage(ok);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const go = (m: Mode) => {
    setMode(m);
    setMessage(null);
    setPassword('');
    setConfirm('');
    setCode('');
  };

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    void run(async (sb) => {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return error.message;
    });
  };

  const signUp = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setMessage(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setMessage('Passwords do not match.');
    void run(async (sb) => {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return error.message;
      // Confirmations are off, so a session comes back and the auth listener
      // takes over. If a project later turns confirmations on, guide them.
      if (!data.session) return 'Account created. Check your email to confirm, then sign in.';
    });
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    void run(async (sb) => {
      const { error } = await sb.auth.signInWithOtp({ email });
      if (error) return error.message;
      go('otp-code');
      setMessage('Check your email for a 6-digit code.');
    });
  };

  const verifyCode = (e: FormEvent) => {
    e.preventDefault();
    void run(async (sb) => {
      const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) return error.message;
    });
  };

  const sendReset = (e: FormEvent) => {
    e.preventDefault();
    void run(async (sb) => {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) return error.message;
      setMessage('If that email has an account, a reset link is on its way.');
    });
  };

  const updatePassword = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setMessage(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setMessage('Passwords do not match.');
    void run(async (sb) => {
      const { error } = await sb.auth.updateUser({ password });
      if (error) return error.message;
      setRecovering(false);
      go('password');
    });
  };

  if (!checked) return <Backdrop />;
  if (session && !recovering) return <>{children}</>;

  const emailField = (
    <Field>
      <label htmlFor="pa-email">Email</label>
      <TextInput
        id="pa-email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        fullWidth
      />
    </Field>
  );

  return (
    <Backdrop>
      <Window style={{ width: 380 }}>
        <WindowHeader>{HEADERS[mode]}</WindowHeader>
        <WindowContent>
          <p style={{ marginTop: 0, fontSize: 13 }}>
            Sign in so the machine remembers where you left off. This is <i>your</i> account — the
            computer you're about to open belongs to someone else.
          </p>

          {mode === 'password' && (
            <form onSubmit={signIn}>
              {emailField}
              <Field>
                <label htmlFor="pa-pass">Password</label>
                <TextInput
                  id="pa-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
              </Field>
              <Button type="submit" disabled={busy || !email || !password} fullWidth>
                Sign in
              </Button>
              <LinkRow>
                <TextLink type="button" onClick={() => go('signup')} disabled={busy}>
                  Create account
                </TextLink>
                <TextLink type="button" onClick={() => go('reset-request')} disabled={busy}>
                  Forgot password?
                </TextLink>
                <TextLink type="button" onClick={() => go('otp-email')} disabled={busy}>
                  Email me a code instead
                </TextLink>
              </LinkRow>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={signUp}>
              {emailField}
              <Field>
                <label htmlFor="pa-pass">Password (min {MIN_PASSWORD})</label>
                <TextInput
                  id="pa-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
              </Field>
              <Field>
                <label htmlFor="pa-confirm">Confirm password</label>
                <TextInput
                  id="pa-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  fullWidth
                />
              </Field>
              <Button type="submit" disabled={busy || !email || !password} fullWidth>
                Create account
              </Button>
              <LinkRow>
                <TextLink type="button" onClick={() => go('password')} disabled={busy}>
                  Back to sign in
                </TextLink>
              </LinkRow>
            </form>
          )}

          {mode === 'otp-email' && (
            <form onSubmit={sendCode}>
              {emailField}
              <Button type="submit" disabled={busy || !email} fullWidth>
                Send code
              </Button>
              <LinkRow>
                <TextLink type="button" onClick={() => go('password')} disabled={busy}>
                  Back to sign in
                </TextLink>
              </LinkRow>
            </form>
          )}

          {mode === 'otp-code' && (
            <form onSubmit={verifyCode}>
              <Field>
                <label htmlFor="pa-code">6-digit code sent to {email}</label>
                <TextInput
                  id="pa-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  fullWidth
                />
              </Field>
              <Button type="submit" disabled={busy || code.length < 6} fullWidth>
                Verify
              </Button>
              <LinkRow>
                <TextLink type="button" onClick={() => go('otp-email')} disabled={busy}>
                  Use a different email
                </TextLink>
                <TextLink type="button" onClick={() => go('password')} disabled={busy}>
                  Back to sign in
                </TextLink>
              </LinkRow>
            </form>
          )}

          {mode === 'reset-request' && (
            <form onSubmit={sendReset}>
              {emailField}
              <Button type="submit" disabled={busy || !email} fullWidth>
                Send reset link
              </Button>
              <LinkRow>
                <TextLink type="button" onClick={() => go('password')} disabled={busy}>
                  Back to sign in
                </TextLink>
              </LinkRow>
            </form>
          )}

          {mode === 'reset-update' && (
            <form onSubmit={updatePassword}>
              <Field>
                <label htmlFor="pa-pass">New password (min {MIN_PASSWORD})</label>
                <TextInput
                  id="pa-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
              </Field>
              <Field>
                <label htmlFor="pa-confirm">Confirm new password</label>
                <TextInput
                  id="pa-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  fullWidth
                />
              </Field>
              <Button type="submit" disabled={busy || !password} fullWidth>
                Update password
              </Button>
            </form>
          )}

          {message && (
            <Frame
              variant="well"
              style={{ marginTop: 12, padding: '5px 8px', fontSize: 12, width: '100%' }}
            >
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
