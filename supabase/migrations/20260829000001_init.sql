-- Last Login: initial schema.
--
-- Two worlds:
--   * schema `game`  — master story content. PRIVATE. Never exposed through
--                      the API. Only the service role (Edge Functions) reads it.
--   * schema `public` — per-player progress, isolated by user_id via RLS.
--                      Players may READ their own rows; all writes go through
--                      Edge Functions using the service role.

-- ---------------------------------------------------------------------------
-- Private game-content schema
-- ---------------------------------------------------------------------------
create schema if not exists game;

-- Make sure API roles can't touch it even if defaults change.
revoke all on schema game from public;
revoke all on schema game from anon;
revoke all on schema game from authenticated;
grant usage on schema game to service_role;

-- v1 stores each season's content as one validated JSON document (the same
-- shape the engine consumes). Relational authoring tables can replace this
-- later without touching player data.
create table game.seasons (
  slug text primary key,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on all tables in schema game to service_role;
alter default privileges in schema game grant select on tables to service_role;

-- ---------------------------------------------------------------------------
-- Player progress (public schema, RLS-isolated)
-- ---------------------------------------------------------------------------
create table public.player_seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  season_slug text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_slug)
);

alter table public.player_seasons enable row level security;

-- Defense in depth: table privileges AND RLS.
-- authenticated gets SELECT only (RLS filters to their own row); insert /
-- update / delete are not granted at all — progression is only written
-- server-side by the Edge Function (service role bypasses both layers).
grant select on public.player_seasons to authenticated;

create policy "players read own progress"
  on public.player_seasons
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Analytics-ready event log (append-only, service-role only, no policies).
create table public.player_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  season_slug text not null,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.player_events enable row level security;
-- No grants and no policies: clients can neither read nor write events.

create index player_events_user_idx on public.player_events (user_id, season_slug, created_at);

-- The Edge Function (service role) is the only writer of player state/events.
-- New Supabase projects grant nothing by default, so grant explicitly.
grant all on public.player_seasons to service_role;
grant all on public.player_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Strip residual default privileges from API client roles (TRUNCATE in
-- particular is not subject to RLS).
revoke truncate, references, trigger on public.player_seasons from anon, authenticated;
revoke all on public.player_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger player_seasons_touch
  before update on public.player_seasons
  for each row execute function public.touch_updated_at();

create trigger game_seasons_touch
  before update on game.seasons
  for each row execute function public.touch_updated_at();
