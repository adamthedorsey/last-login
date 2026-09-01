import { createContext, useContext } from 'react';
import type { ActionResult, GameAction, StateView } from '@gamecore/types.ts';
import type { GameClient } from './client';

export interface Toast {
  id: number;
  title: string;
  description: string;
  /** Icon name (src/os/icons.tsx) shown beside the description. */
  icon?: string;
  /** 'case': the Case Files receipt — sheriff seal, black->teal band,
   * clicking opens Case Files at the saved copy. */
  variant?: 'case';
  /** For 'case': the player-document id the click should reveal. */
  docId?: string;
  /** For 'case': a saved bookmark id the click should reveal (Bookmarks tab). */
  bookmarkId?: string;
}

export interface GameContextValue {
  ready: boolean;
  view: StateView | null;
  clientMode: 'dev' | 'supabase';
  /** Send an action. Discoveries / demo-end side effects are handled centrally. */
  send(action: GameAction): Promise<ActionResult>;
  refreshView(): Promise<void>;
  toasts: Toast[];
  dismissToast(id: number): void;
  /** Bumps whenever a discovery lands so views refetch (new items may exist). */
  contentEpoch: number;
  /** Bumps on every server round-trip made while online (the TX light). */
  netActivity: number;
  /** Bumps when the server reports the line-pickup scare fired. */
  lineDropSignal: number;
  showEndCard: boolean;
  setShowEndCard(v: boolean): void;
  /** The desktop shell reports whether the player is actually in the game
   * (past the menu/boot/login). Ambient mail & chat notifications — and the
   * wire heartbeat — hold until then. */
  setInGame(active: boolean): void;
  /** The handler wrote back (a 'casefile' wire notice): the tray blinks
   * until Case Files shows the messages and clears it. */
  caseAlert: boolean;
  clearCaseAlert(): void;
  client: GameClient | null;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
