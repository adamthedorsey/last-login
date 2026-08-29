import type { ActionResult, GameAction } from '@gamecore/types.ts';
import type { GameClient } from './client';
import { supabase } from './supabase';

export class SupabaseGameClient implements GameClient {
  readonly mode = 'supabase' as const;

  async send(action: GameAction): Promise<ActionResult> {
    const { data, error } = await supabase.functions.invoke<ActionResult>('game', {
      body: action,
    });
    if (error || !data) {
      console.error('game function call failed', error);
      return { type: 'error', error: 'network' };
    }
    return data;
  }
}
