# Last Login

A browser-based narrative mystery game. The player logs into a preserved teenager's
personal computer from 1997 — the computer **is** the game world. They read email,
scroll instant-messenger logs, open files, browse a tiny fictional web, and piece
together what happened.

Season 1: **The Overlook** — Maple Glen, October 1997. Casey Brennan, 16, has been
missing for a week. Her machine is still on.

Everything is fictional: the OS ("Microtech Horizons 97"), the ISP ("WestWind
Online"), the messenger ("BuddyLine"), the browser ("NetVoyager"), the search
engine ("SearchHound"), every person and place. The visual language evokes 1997
consumer computing without reproducing any real trademarks, logos, or interfaces.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| UI toolkit | [React95](https://github.com/react95-io/React95) (styled-components 6) |
| Window/app state | zustand |
| Backend | Supabase (Auth, Postgres + RLS, Edge Functions) |
| Tests | Vitest (engine/anti-cheat) + pgTAP (RLS) + a bundle-leak audit script |

---

## Architecture

The three concerns the project keeps separate, so future seasons can swap any one:

```
GAME ENGINE              SEASON CONTENT               OS / VISUAL THEME
(pure rules)             (data)                       (React shell)
supabase/functions/      supabase/functions/_shared/  src/os/*  src/apps/*
_shared/gamecore/        gamecore/season1.ts          (React95 "Horizons 97")
engine.ts, types.ts      + generated supabase/seed.sql
```

### The game core (server-side, shared)

`supabase/functions/_shared/gamecore/` is the heart:

- **`types.ts`** — content model (`ContentItem`, `Requirement`, `Discovery`, …),
  player state, actions, and the **redacted DTO types** that are the only shapes a
  client ever sees.
- **`engine.ts`** — a pure, deterministic function
  `handleAction(content, state, action, now) -> { state', result, events }`.
  All rules live here: requirement evaluation (AND/OR trees over discoveries /
  opened items / unlocks / flags), ancestor-chain visibility, password checks with
  brute-force lockout, discovery triggers, gated search, DTO redaction.
- **`season1.ts`** — the entire story as data. Items form one tree (folders, files,
  photos, mailboxes, emails, IM conversations, web pages, trash, shortcuts,
  bookmarks) with optional `requires`, `password`, `onOpen` effects.

Two hosts run the same engine:

1. **Production / supabase mode** — the `game` Edge Function
   (`supabase/functions/game/index.ts`): authenticates the player, loads season
   content from the **private `game` schema**, loads player state, runs the engine,
   persists state + analytics events, returns the redacted result.
2. **Dev mode** — `src/game/devGameClient.ts` runs the engine in-browser against
   the raw content with localStorage persistence, so the whole game iterates with
   zero backend. It is loaded strictly behind `import.meta.env.DEV` and is
   dead-code-eliminated from production bundles (verified — see anti-cheat).

The frontend only ever talks through the one-method `GameClient` interface
(`send(action) -> result`), so the two adapters are interchangeable.

### Frontend layout

```
src/
  game/        GameClient interface, supabase + dev adapters, GameProvider
               (central discovery/toast/demo-end handling)
  os/          the fictional OS: window manager (zustand), WindowFrame,
               Taskbar + Start menu, desktop icons, boot/login sequence,
               original pixel icon set, synthesized UI sounds (mutable)
  apps/        applications registered in a small AppDefinition registry:
               File Explorer, Jotter (notepad), PicturePost (photos),
               WestWind Mail, BuddyLine (IM), NetVoyager (browser),
               Recycle Bin, Case Notes, CardShark 2 (a broken game, for flavor)
  dev/         DEV-only panel (reset, state dump, grant discovery, skip login)
```

Window management state (position, z-order, minimize/maximize, taskbar) is fully
separate from app state; apps receive `{ windowId, props }` and use the game
context. The in-game **web browser renders structured content blocks, never raw
HTML** — there is no XSS surface from story content.

### Time

The in-world clock is frozen season data (`clock.now`, Oct 18 1997, 9:47 PM) and
flows through `StateView` — components never use the real date for in-world time.
A future event scheduler can replace the constant without touching components.

---

## Database schema

Migration: `supabase/migrations/20260829000001_init.sql`

- **`game.seasons`** *(private schema)* — master story content, one validated
  JSONB document per season (the exact shape the engine consumes). The schema has
  all API-role grants revoked; only `service_role` can read it. V1 deliberately
  stores content as one document per season — relational authoring tables can
  replace it later without touching player data.
- **`public.player_seasons`** — per-player progress (`state` JSONB), unique per
  `(user_id, season_slug)`. RLS: players can **select their own row only**; there
  are **no insert/update/delete policies** — every write goes through the Edge
  Function with the service role.
- **`public.player_events`** — append-only analytics log (opens, discoveries,
  password attempts, searches, resets). RLS enabled with **no policies**: clients
  can neither read nor write it. Enough to answer "where do players get stuck /
  time-to-first-clue / abandonment" later without building an analytics system now.

`supabase/seed.sql` is **generated** from `season1.ts` by `npm run gen:seed` —
the TypeScript content is the single source of truth.

---

## Security / anti-cheat approach

Rule: **the client may only know what the player is currently entitled to know.**

- Story content never ships to the browser. Production clients receive only
  redacted DTOs from the Edge Function; listings omit items whose requirements are
  unmet (they aren't "hidden", they simply don't exist client-side).
- `requires`, `password`, `onOpen`, `searchText` are stripped from every response
  (locked-in by tests).
- Search runs server-side and only indexes pages the player can already reach.
- The player-progress table is select-own-only; all writes are server-side. The
  event log and the `game` schema are completely unreachable from the API roles.
- Password attempts are rate-limited (8 tries, then a 5-minute lockout) in the
  authoritative engine.
- Production build ships no sourcemaps, and `npm run check:bundle` scans `dist/`
  for known story strings (login password, gated character names, discovery ids)
  and fails the build on any leak. It has already caught one real leak in
  development.
- DEV tools (dev adapter, dev panel, login skip) sit behind `import.meta.env.DEV`
  and are dead-code-eliminated from production bundles (the dev/content chunks are
  not even emitted).
- The browser only uses the publishable key; the service-role key exists only in
  Edge Function environment.
- Tests assert the core promise directly: *a new player requesting the final clue
  is denied; a player who completed the prerequisites receives it.*

Verify everything with:

```bash
npm run verify   # build + unit tests + bundle leak audit
```

---

## Player auth vs. computer login

Two deliberately separate concepts:

- **Player account** (Supabase Auth — email OTP or anonymous "guest" play): who is
  saving progress. Handled by `src/AuthGate.tsx`, skipped entirely in dev mode.
- **Computer login** (the Horizons 97 password prompt): a *story puzzle*, validated
  server-side like any other password target. Being authenticated as a player while
  stuck at the fictional login is the intended first experience.

---

## Running locally

### Zero-setup dev mode (no Supabase needed)

```bash
npm install
npm run dev
```

Dev builds default to the in-browser engine (`VITE_GAME_BACKEND` unset). The DEV
button (top right) gives reset/state/discovery tools; the login screen has a
"DEV: skip" button. The login answer for testing is on the sticky note + in
`season1.ts` (`sunflower97`).

### Full stack (Supabase local)

```bash
supabase start                 # local stack (Docker)
supabase db reset              # applies migrations + generated seed.sql
supabase functions serve game  # serves the authoritative endpoint
```

Note: this repo's `config.toml` maps local services to `554xx` ports (instead of
the default `543xx`) so it can run beside another local Supabase project, and
disables the local analytics container. `supabase status` prints the actual URLs
and keys.

Then in `.env` (copy from `.env.example`):

```
VITE_GAME_BACKEND=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from `supabase status`>
```

For guest play, enable **anonymous sign-ins** in Auth settings (local
`supabase/config.toml`: `[auth] enable_anonymous_sign_ins = true`).

### Hosted Supabase

1. Create a project, then `supabase link --project-ref <ref>`.
2. `supabase db push` (migrations) and apply `supabase/seed.sql` (SQL editor or
   `supabase db push --include-seed` workflows).
3. In **Settings → API → Exposed schemas**, add `game` (the Edge Function reads it
   through PostgREST; client roles still have zero privileges on it — verified by
   the pgTAP tests).
4. `supabase functions deploy game`.
5. Set the two `VITE_*` variables at build time. Never expose the service-role key.

### Tests

```bash
npm test              # engine + anti-cheat unit tests (no backend needed)
npm run verify        # build + tests + bundle leak audit
supabase test db      # pgTAP RLS tests (needs local stack)
```

---

## Demo walkthrough (spoilers)

1. **Boot / login** — the sticky note ("mom's flower + the year") + the sunflower
   photo motif → password `sunflower97`.
2. **Desktop** — mundane 1997 teenage machine: homework, mixtape lists, band fan
   pages, chain letters, a cat photo. The local paper's site mentions the search
   for Casey.
3. **WestWind Mail** — Dana's *"please write back"* (Oct 11): Casey said she was
   meeting Mel at the overlook; Mel provably wasn't there. → discovery **The
   overlook plan** (a quiet "case notes updated" toast).
4. **BuddyLine** — a buddy named **GhostBridge** now stands out; its saved log
   from the night of Oct 10 shows someone arranging the meeting, proving identity
   with a secret only Mel should know, and demanding the logs be deleted. →
   **GhostBridge**.
5. **Jotter** — `My Documents\personal stuff\oct_pages.txt` (now visible): Casey's
   diary doubts — "GhostBridge types like someone doing an impression of a person…
   it has to be mel. unless somehow it isn't." → **The third screen name**, end of
   demo. The desktop stays explorable.

Also gated: searching "overlook" on SearchHound only surfaces the MapFinder page
for Miller Point after step 3.

---

## Known limitations

- The login puzzle is a placeholder; the final design should require evidence
  from outside the login screen itself.
- Content lives in one JSONB document per season (fine at this scale; needs
  relational authoring tables + tooling for a full season).
- No keyboard navigation
  of desktop icons yet (accessibility pass needed).
- Photos are placeholder SVGs served from `public/` (all mundane by design —
  clue-bearing photos must be served through the authorized content path).
- Dev panel against the supabase backend only offers reset (server-side dev
  actions behind a function env flag are stubbed out, not implemented).
- No e2e test harness yet (the slice was verified by hand in-browser).
- `player_events` are written but nothing reads them yet (no analytics views).

## Next 5 highest-value steps

1. **Real login puzzle + first-run framing** — why are we at this machine? A
   proper cold open (voicemail text, a note from the sheriff's office) and a
   login puzzle solvable from physical-world hints.
2. **Season 1, Act 1 content pass** — grow to a few dozen emails/logs/files with
   2–3 optional side threads, and 1–2 more password targets (a locked diary, a
   webmail account) to exercise the unlock system.
3. **E2E + CI** — Playwright happy path (login → chain → end card) against the
   dev adapter, plus `npm run verify` and `supabase test db` in CI.
4. **Scheduled/triggered events** — a GameClock event table ("an email arrives
   after discovery X", "a buddy signs on"), which the engine already has room for
   (`events`, `contentEpoch` refetching, toasts).
5. **Authoring ergonomics** — content validation (zod schema + referential checks
   for ids/requirements at `gen:seed` time) so writers can't ship a broken chain.
