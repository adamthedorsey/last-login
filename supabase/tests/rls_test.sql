-- RLS / isolation tests. Run with a local stack: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Two players.
insert into auth.users (id, email, created_at)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', now()),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', now());

insert into public.player_seasons (user_id, season_slug, state)
values
  ('00000000-0000-0000-0000-00000000000a', 'season-1', '{"loggedIn": true}'),
  ('00000000-0000-0000-0000-00000000000b', 'season-1', '{"loggedIn": false}');

insert into public.player_events (user_id, season_slug, type)
values ('00000000-0000-0000-0000-00000000000b', 'season-1', 'open');

-- Act as player A.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  (select count(*)::int from public.player_seasons),
  1,
  'player A sees exactly one progress row (not player B''s)'
);

select is(
  (select user_id from public.player_seasons),
  '00000000-0000-0000-0000-00000000000a'::uuid,
  'and it is their own row'
);

select throws_ok(
  $$insert into public.player_seasons (user_id, season_slug, state)
    values ('00000000-0000-0000-0000-00000000000a', 'hacked', '{}')$$,
  '42501',
  null,
  'players cannot insert progress rows directly'
);

select throws_ok(
  $$update public.player_seasons set state = '{"hacked": true}'$$,
  '42501',
  null,
  'players cannot update progress rows directly'
);

select throws_ok(
  $$delete from public.player_seasons$$,
  '42501',
  null,
  'players cannot delete progress rows'
);

select throws_ok(
  $$select * from public.player_events$$,
  '42501',
  null,
  'players cannot read the analytics event log'
);

select throws_ok(
  $$select * from game.seasons$$,
  '42501',
  null,
  'players cannot read master game content'
);

-- Back to superuser: confirm the failed writes changed nothing.
reset role;
select is(
  (select count(*)::int from public.player_seasons where state ? 'hacked'),
  0,
  'no client write attempt landed'
);

select * from finish();
rollback;
