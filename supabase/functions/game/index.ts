/**
 * `game` Edge Function — the single authoritative game endpoint.
 *
 * POST body: a GameAction (see _shared/gamecore/types.ts).
 * Response:  an ActionResult — always redacted to what the player may know.
 *
 * Flow: authenticate player -> load season content from the PRIVATE `game`
 * schema -> load/create the player's state row -> run the pure engine ->
 * persist state + analytics events -> return the redacted result.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleAction,
  newPlayerState,
  type GameAction,
  type PlayerState,
  type SeasonContent,
} from '../_shared/gamecore/index.ts';

const SEASON_SLUG = 'season-1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const VALID_ACTIONS = new Set([
  'getState',
  'login',
  'getDesktop',
  'listChildren',
  'open',
  'attemptPassword',
  'visit',
  'search',
  'getBuddies',
  'getConversation',
  'say',
  'saveDocument',
  'createFolder',
  'moveDocument',
  'renameItem',
  'resetSeason',
]);

// Per-field length caps; `text` is the player's own Notepad document.
const FIELD_LIMITS: Record<string, number> = {
  password: 500,
  parentId: 500,
  itemId: 500,
  targetId: 500,
  url: 500,
  query: 500,
  docId: 100,
  folderId: 100,
  name: 100,
  screenname: 100,
  promptId: 100,
  text: 20000,
};

function parseAction(raw: unknown): GameAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== 'string' || !VALID_ACTIONS.has(a.type)) return null;
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    if (key in a && (typeof a[key] !== 'string' || (a[key] as string).length > limit)) return null;
  }
  return a as unknown as GameAction;
}

// Service-role client: full access, used ONLY server-side. Never exposed.
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

let cachedContent: SeasonContent | null = null;

async function loadContent(): Promise<SeasonContent> {
  if (cachedContent) return cachedContent;
  const { data, error } = await admin
    .schema('game')
    .from('seasons')
    .select('content')
    .eq('slug', SEASON_SLUG)
    .single();
  if (error || !data) {
    throw new Error(`Season content not seeded (${error?.message}). Run: supabase db reset (applies seed.sql)`);
  }
  cachedContent = data.content as SeasonContent;
  return cachedContent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ type: 'error', error: 'method_not_allowed' }, 405);

  // --- Authenticate the PLAYER (site account, not the in-game computer) ---
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ type: 'error', error: 'unauthorized' }, 401);
  }
  const userId = userData.user.id;

  let action: GameAction | null = null;
  try {
    action = parseAction(await req.json());
  } catch {
    /* fallthrough */
  }
  if (!action) return json({ type: 'error', error: 'bad_request' }, 400);

  try {
    const content = await loadContent();

    // --- Load or create this player's state row ---
    const { data: row } = await admin
      .from('player_seasons')
      .select('id, state')
      .eq('user_id', userId)
      .eq('season_slug', SEASON_SLUG)
      .maybeSingle();

    let state: PlayerState;
    let rowId: string;
    if (row) {
      state = row.state as PlayerState;
      rowId = row.id;
    } else {
      state = newPlayerState();
      const { data: inserted, error: insErr } = await admin
        .from('player_seasons')
        .insert({ user_id: userId, season_slug: SEASON_SLUG, state })
        .select('id')
        .single();
      if (insErr || !inserted) throw new Error(`state insert failed: ${insErr?.message}`);
      rowId = inserted.id;
    }

    // --- Run the authoritative engine ---
    const outcome = handleAction(content, state, action, Date.now());

    if (outcome.changed) {
      const { error: updErr } = await admin
        .from('player_seasons')
        .update({ state: outcome.state })
        .eq('id', rowId);
      if (updErr) throw new Error(`state update failed: ${updErr.message}`);
    }

    if (outcome.events.length > 0) {
      await admin.from('player_events').insert(
        outcome.events.map((e) => ({
          user_id: userId,
          season_slug: SEASON_SLUG,
          type: e.type,
          payload: e.payload ?? null,
        })),
      );
    }

    return json(outcome.result);
  } catch (err) {
    console.error('game function error:', err);
    return json({ type: 'error', error: 'server_error' }, 500);
  }
});
