import type { ActionResult, GameAction } from '@gamecore/types.ts';

export type BackendMode = 'dev' | 'supabase';

/** Thin transport: every game interaction is one action -> one redacted result. */
export interface GameClient {
  readonly mode: BackendMode;
  send(action: GameAction): Promise<ActionResult>;
}

export function backendMode(): BackendMode {
  // In production builds this collapses to 'supabase' and the dev adapter
  // (which bundles story content) is dead-code-eliminated by Vite.
  if (import.meta.env.DEV && import.meta.env.VITE_GAME_BACKEND !== 'supabase') {
    return 'dev';
  }
  return 'supabase';
}

export async function createGameClient(): Promise<GameClient> {
  if (import.meta.env.DEV && import.meta.env.VITE_GAME_BACKEND !== 'supabase') {
    const { DevGameClient } = await import('./devGameClient');
    return new DevGameClient();
  }
  const { SupabaseGameClient } = await import('./supabaseGameClient');
  return new SupabaseGameClient();
}
