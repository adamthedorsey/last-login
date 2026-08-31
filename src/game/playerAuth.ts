/**
 * Player-account helpers (the real person's save account, NOT the in-game
 * computer login). Kept out of the 1997 fiction: the only place these
 * surface in-shell is the main-menu airlock. Everything is guarded to
 * supabase backend mode — dev builds have no player session and must never
 * import the supabase client (its module throws without env keys).
 */
import { useEffect, useState } from 'react';
import { backendMode } from './client';

/** The signed-in player's email, reactively. `null` in dev mode or while
 * signed out. */
export function usePlayerEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (backendMode() !== 'supabase') return;
    let sub: { unsubscribe(): void } | null = null;
    void (async () => {
      const { supabase } = await import('./supabase');
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      sub = supabase.auth.onAuthStateChange((_evt, s) => {
        setEmail(s?.user?.email ?? null);
      }).data.subscription;
    })();
    return () => sub?.unsubscribe();
  }, []);
  return email;
}

/** Sign the player out. AuthGate's own auth listener then swaps the whole
 * tree back to the sign-in screen. No-op in dev mode. */
export async function signOutPlayer(): Promise<void> {
  if (backendMode() !== 'supabase') return;
  const { supabase } = await import('./supabase');
  await supabase.auth.signOut();
}
