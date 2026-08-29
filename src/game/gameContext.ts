import { createContext, useContext } from 'react';
import type { ActionResult, GameAction, StateView } from '@gamecore/types.ts';
import type { GameClient } from './client';

export interface Toast {
  id: number;
  title: string;
  description: string;
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
  client: GameClient | null;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
