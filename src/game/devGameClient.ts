/**
 * DEVELOPMENT-ONLY adapter: runs the authoritative engine in the browser
 * against the raw season content so the game can be iterated on without a
 * running Supabase stack. Loaded exclusively behind `import.meta.env.DEV`
 * (see client.ts) — never present in production bundles.
 */
import { handleAction } from '@gamecore/engine.ts';
import { SEASON1 } from '@gamecore/season1.ts';
import { newPlayerState, type ActionResult, type GameAction, type PlayerState } from '@gamecore/types.ts';
import type { GameClient } from './client';

const STORAGE_KEY = 'lastlogin.dev.playerState';

export class DevGameClient implements GameClient {
  readonly mode = 'dev' as const;
  private state: PlayerState;

  constructor() {
    let restored: PlayerState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) restored = JSON.parse(raw) as PlayerState;
    } catch {
      restored = null;
    }
    this.state = restored ?? newPlayerState();
  }

  send(action: GameAction): Promise<ActionResult> {
    const outcome = handleAction(SEASON1, this.state, action, Date.now());
    this.state = outcome.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* private mode etc. — dev-only convenience */
    }
    return Promise.resolve(outcome.result);
  }

  // ----- dev-panel helpers (dev builds only) -----

  devGetState(): PlayerState {
    return JSON.parse(JSON.stringify(this.state)) as PlayerState;
  }

  devMutate(fn: (s: PlayerState) => void): void {
    fn(this.state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  devListDiscoveries(): Array<{ id: string; title: string }> {
    return SEASON1.discoveries.map((d) => ({ id: d.id, title: d.title }));
  }
}
