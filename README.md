# Last Login

A browser-based narrative mystery game. The player logs into a preserved teenager's
personal computer from 1997 — the computer **is** the game world. They read email,
scroll instant-messenger logs, open files, browse a tiny fictional web, and piece
together what happened.

Season 1: **Without a Trace** — Humble, West Virginia, October 1997. Casey
Taylor, 16, has been missing for a week. Her machine is still on.

Everything is fictional: the OS ("Microtech Horizons 95"), the ISP ("WestWind
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
_shared/gamecore/        gamecore/season1.ts          (React95 "Horizons 95")
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
  photos, mailboxes, emails with attachments, IM conversations, web pages, trash,
  shortcuts, bookmarks) with optional `requires`, `password`, `onOpen` effects —
  plus `schedule` (timed ambient events while online), `remoteAccess` (the
  dial-in takeover set-piece), and `handler` (the Case File memos).

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
               File Explorer, Notepad, Picture Viewer, Mail,
               Chat (BuddyLine network), NetVoyager (browser), Recycle Bin,
               Case File (the diegetic case-handler frame),
               and accessories: Calculator, Calendar,
               Solitaire, Minefield, Paint, CD Player, Clock
  dev/         DEV-only panel (reset, state dump, grant discovery, skip login)
```

Window management state (position, z-order, minimize/maximize, taskbar) is fully
separate from app state; apps receive `{ windowId, props }` and use the game
context. The in-game **web browser renders structured content blocks, never raw
HTML** — there is no XSS surface from story content.

### Time

The in-world clock is frozen season data (`clock.now`, Oct 18 1997, 9:47 PM) and
flows through `StateView` — components never use the real date for in-world time.
Real time exists in exactly one place: the scheduled-event clock, which measures
seconds into the current dial-up connection (server-side, via `onlineSince`) to
fire content-authored ambient events — never wall-clock dates.

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
- **Computer login** (the Horizons 95 password prompt): a *story puzzle*, validated
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

### Frontend hosting (Vercel)

Vercel hosts only the built SPA; the game logic stays in the Supabase Edge
Function (which already sends `Access-Control-Allow-Origin: *`). `vercel.json`
pins the Vite build (`npm run build` → `dist/`) and the SPA fallback rewrite.

1. Import the repo into Vercel (framework auto-detects as Vite).
2. Set three **build-time** environment variables (Production + Preview) —
   these are the same values as local `.env`; the publishable key is
   client-safe, the service-role key must NEVER be set here:
   - `VITE_GAME_BACKEND=supabase`
   - `VITE_SUPABASE_URL=https://<ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
3. Deploy. Then add the deployed origin(s) to Supabase Auth so email flows
   resolve: **Authentication → URL Configuration** — set **Site URL** to the
   production URL and add the Vercel domains (incl. `https://*.vercel.app` for
   previews) to **Redirect URLs**. Password-reset links use
   `window.location.origin`, so an unlisted origin is rejected. (OTP codes and
   password sign-in don't need this; only the reset *link* does.)
4. For real players, configure **custom SMTP** in Supabase — the default
   mailer only sends to your org's own addresses — and, for a public launch,
   turn `enable_confirmations` back on so new emails are verified.

### Tests

```bash
npm test              # engine + anti-cheat unit tests (no backend needed)
npm run verify        # build + tests + bundle leak audit
supabase test db      # pgTAP RLS tests (needs local stack)
```

---

## Demo walkthrough (spoilers)

1. **Boot / login** — the sticky note ("mom's flower + the year") + the
   sunflower photos → password `sunflower97`. Note who signed the sticky note.
2. **Act 1** — Sadie's *"please write back"*: Casey was meeting someone at the
   river and told no one who → the Recycle Bin holds a chat log she was told
   to delete: nightshift proved himself with a word only Sadie knew. (It's
   also floating on the screen saver. It always was.)
3. **Act 2** — Sadie's *"it's not chad"* (you don't get jealous of yourself) →
   Aunt Ruth: Frank saw a clean, quiet, dark 4x4 at the bend. Not Chad's.
4. **Act 3** — a "history notes" file that is no such thing (the ledger:
   Sparks writes, Value-Med fills) → Sam Reed's forwarded letter → Rebecca
   Wright: her first husband used to answer her mail *as her* → the deleted
   diary: modified and deleted at **2:14 AM, October 11** — hours after Casey
   vanished. Whoever it was didn't break in. They were already home. END.

Full design docs (heavy spoilers): `story/truth-timeline.md`,
`story/who-knows-what.md`, and the generated `docs/clue-graph.md`.
Gameplay mechanics and design pillars (with the feature roadmap):
`docs/gameplay-mechanics.md`.

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

## Next highest-value steps

1. **Real login puzzle + first-run framing** — why are we at this machine? The
   Case File app now carries the frame; a proper cold open (voicemail text, a
   note from the sheriff's office) and a login puzzle solvable from
   physical-world hints are still open.
2. **Season 1, Act 1 content pass** — grow to a few dozen emails/logs/files with
   2–3 optional side threads, and 1–2 more password targets (a locked diary, a
   webmail account) to exercise the unlock system.
3. **E2E + CI** — Playwright happy path (login → chain → end card) against the
   dev adapter, plus `npm run verify` and `supabase test db` in CI.
4. **Authoring ergonomics** — content validation (zod schema + referential checks
   for ids/requirements at `gen:seed` time) so writers can't ship a broken chain.

(The former #4, scheduled/triggered events, shipped along with the rest of the
gameplay-mechanics roadmap — issues #2–#8, indexed in
`docs/gameplay-mechanics.md`: ambient events, the live buddy list, slow web
loading, mail attachments, the remote-access set-piece, the Case File app,
and workspace copies.)
