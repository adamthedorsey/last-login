/**
 * PLAYER authentication (the real person's saved-progress account) — entirely
 * separate from the fictional in-game computer login, which is part of the
 * story. Uses Supabase's built-in auth (GoTrue) directly.
 *
 * Look: deliberately MODERN, not 1997. This screen sits OUTSIDE the game
 * world — before the machine is ever powered on — so it drops the Win95
 * chrome and instead rhymes with the dark evidence-room main menu it leads
 * into. (It still obeys the global aliased-text rule; vector faces alias
 * cleanly, so the flat dark layout reads modern without a smoothing carve-out.)
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
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { backendMode } from './game/client';
import { PIXEL_MONO } from './theme';

const MIN_PASSWORD = 6; // matches supabase/config.toml auth.minimum_password_length

/* A dark, cinematic airlock — one soft light on a near-black room, echoing
 * the evidence-room menu that follows. */
const Backdrop = styled.div`
  height: 100vh;
  width: 100vw;
  background:
    radial-gradient(80% 60% at 50% 38%, #1a1c22 0%, #0b0c0e 62%, #060607 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e6e4dd;
`;

const Card = styled.div`
  width: 340px;
  max-width: calc(100vw - 40px);
  padding: 30px 30px 26px;
  background: #121317;
  border: 1px solid #24262c;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
`;

const Wordmark = styled.div`
  font-family: ${PIXEL_MONO};
  font-size: 30px;
  letter-spacing: 7px;
  color: #d8d3c4;
  text-align: center;
`;

const Subtitle = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12.5px;
  line-height: 1.5;
  color: #8f8b80;
  text-align: center;
  margin: 10px 0 22px;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 14px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #86827a;
`;

const Input = styled.input`
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 9px 11px;
  background: #1b1d22;
  border: 1px solid #2f323a;
  color: #eceae3;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  letter-spacing: normal;
  text-transform: none;
  box-sizing: border-box;
  &::placeholder {
    color: #5f5c56;
  }
  &:focus {
    outline: none;
    border-color: #6f9ba1;
    background: #1e2127;
  }
`;

const Submit = styled.button`
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  background: #e6e4dd;
  color: #16171a;
  border: none;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.4px;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #fff;
  }
  &:disabled {
    background: #33353b;
    color: #6f6d67;
    cursor: default;
  }
`;

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 16px;
  justify-content: center;
`;

const TextLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #9a958a;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #d8d3c4;
    text-decoration: underline;
  }
  &:disabled {
    color: #5f5c56;
    cursor: default;
  }
`;

const Message = styled.div`
  margin-top: 18px;
  padding: 9px 11px;
  background: #1b1d22;
  border-left: 2px solid #6f9ba1;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12.5px;
  line-height: 1.45;
  color: #c7c3b8;
`;

type Mode = 'password' | 'signup' | 'otp-email' | 'otp-code' | 'reset-request' | 'reset-update';

const SUBTITLES: Record<Mode, string> = {
  password: 'Sign in to save your progress. This account is yours — the machine you are about to open is not.',
  signup: 'Create an account so the machine remembers where you leave off.',
  'otp-email': 'We will email you a one-time sign-in code.',
  'otp-code': 'Enter the code we just sent you.',
  'reset-request': 'Enter your email and we will send a reset link.',
  'reset-update': 'Choose a new password for your account.',
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

  const emailInput = (
    <Field>
      Email
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
    </Field>
  );

  return (
    <Backdrop>
      <Card>
        <Wordmark>LAST LOGIN</Wordmark>
        <Subtitle>{SUBTITLES[mode]}</Subtitle>

        {mode === 'password' && (
          <form onSubmit={signIn}>
            {emailInput}
            <Field>
              Password
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Submit type="submit" disabled={busy || !email || !password}>
              Sign in
            </Submit>
            <LinkRow>
              <TextLink type="button" onClick={() => go('signup')} disabled={busy}>
                Create account
              </TextLink>
              <TextLink type="button" onClick={() => go('reset-request')} disabled={busy}>
                Forgot password?
              </TextLink>
              <TextLink type="button" onClick={() => go('otp-email')} disabled={busy}>
                Email me a code
              </TextLink>
            </LinkRow>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={signUp}>
            {emailInput}
            <Field>
              Password (min {MIN_PASSWORD})
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field>
              Confirm password
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Submit type="submit" disabled={busy || !email || !password}>
              Create account
            </Submit>
            <LinkRow>
              <TextLink type="button" onClick={() => go('password')} disabled={busy}>
                Back to sign in
              </TextLink>
            </LinkRow>
          </form>
        )}

        {mode === 'otp-email' && (
          <form onSubmit={sendCode}>
            {emailInput}
            <Submit type="submit" disabled={busy || !email}>
              Send code
            </Submit>
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
              6-digit code sent to {email}
              <Input
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
              />
            </Field>
            <Submit type="submit" disabled={busy || code.length < 6}>
              Verify
            </Submit>
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
            {emailInput}
            <Submit type="submit" disabled={busy || !email}>
              Send reset link
            </Submit>
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
              New password (min {MIN_PASSWORD})
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field>
              Confirm new password
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Submit type="submit" disabled={busy || !password}>
              Update password
            </Submit>
          </form>
        )}

        {message && <Message>{message}</Message>}
      </Card>
    </Backdrop>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  if (backendMode() === 'dev') return <>{children}</>;
  return <SupabaseAuth>{children}</SupabaseAuth>;
}
