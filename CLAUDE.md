# Last Login — project rules

A 1997 desktop mystery game. The player investigates a preserved teenager's PC.
Full architecture in README.md. These rules exist so nothing breaks the period
illusion or the security model. Follow them for EVERY change.

## The Period Guard: it must look, sound, and behave like 1997

**The north star: we are building a system that FUNCTIONS like Windows 95 —
but it IS Horizons 95.** Behavior, interaction patterns, and conventions
follow real Win95 faithfully (double-click to open, rubber-band selection,
Start menu structure, tray behavior, shutdown flow); names, logos, and
branding are always Horizons/fictional, never Microsoft's. When unsure how
something should behave, the answer is "whatever Windows 95 actually did."

**Priority order (owner call): player experience FIRST, 1997 plausibility
as the boundary, Win95 exactness as the reference — not the law.** When a
playability, legibility, or fun improvement conflicts with Win95 fidelity,
take the improvement if a consumer PC of 1997 could plausibly have shipped
it (precedents: the discovery toasts, Arial reading surfaces, the earned
login hint). What never bends: nothing post-1997 in concept, aesthetic, or
interaction idiom.

The bar for any UI change: "could this have shipped on a consumer PC in 1997?"
If not, don't build it that way.

### Layout & chrome
- Build UI from React95 components (beveled buttons, inset wells, gray chrome).
  Never restyle them into something softer or flatter.
- NO rounded corners (except tiny 2px on period artifacts like playing cards),
  NO soft drop shadows (hard offset shadows like `6px 6px 0 rgba(0,0,0,.4)` are
  fine), NO blur, NO glassmorphism/translucency, NO CSS gradients as decoration
  (a banner-image gradient inside artwork is fine; a gradient button is not).
- Hard edges everywhere: 1px solid borders, `outset`/`inset` bevels, dotted
  focus/selection rectangles.
- Selection highlight is solid `#000080` with white text. Period.
- Assume 800x600-era density: compact paddings, 13px-ish UI text, no
  airy whitespace-heavy layouts.
- Desktop icons live on the fixed 96px grid (`docs/desktop-grid.md`): every
  authored `meta.desktop` sits on a documented slot, and items that appear
  or vanish mid-game are authored to FREE slots from that table — update it
  with any change.

### Motion
- No smooth/eased animations, no fades, no springs, no smooth scrolling.
  Things appear, disappear, and snap. Allowed motion: marquee text, a blinking
  block cursor, throbber/progress loops, instant window operations, the Win95
  minimize/restore zoom rectangle (stepped dotted wireframe, fixed frame
  count, constant velocity — `src/os/zoomRect.ts`), and the screen saver
  (constant-velocity linear drift + stepped sprite frames only — no easing,
  ever).
- Deliberate slowness is flavor (dial-up delays, splash screens) — keep each
  under ~2.5s and always click-skippable. Boot-chain exceptions: the
  cold-boot POST runs ~6s with uneven machine-like timing (memory count-up,
  IDE pause), the GUI splash holds ~3.5s (logo over the horizons,
  click-skippable), and the post-login desktop "load" holds ~2.2s of bare
  wallpaper. DOS-era surfaces (POST, ScanDisk) show NO mouse cursor — the
  driver hasn't loaded; the GUI splash and desktop load flicker the busy
  cursors instead (src/os/bootCursor.ts).

### Typography
- OS chrome: W95F (`src/assets/fonts`), registered under the family name
  `ms_sans_serif` so react95 components pick it up; bold weight still comes
  from react95's bold face (the two recreate the same original UI font and
  pair cleanly). Don't introduce other UI fonts.
- TERMINAL surfaces (boot/POST, MS-DOS mode, blue screen, shutdown): Fixedsys
  — use `PIXEL_MONO` from `src/theme.tsx`, at 16px (its crisp native size;
  multiples of 16 only). Short, large, atmospheric text only.
- READING surfaces are Arial (owner call — fonts that shipped by 1997,
  like Arial/Georgia, are fair game): Notepad documents, handler memos,
  email bodies, chat transcripts, the Case Files wizard body (its Times
  serif titles are authentic Win95 Setup style), phone-call responses,
  discovery toasts, the end card — via `DOC_TEXT` (Arial 15/1.55) or
  per-surface Arial. EXCEPTION: documents authored with `meta.mono`
  (the ledger, modem.log — column-aligned evidence a proportional face
  would shred) render `DOC_MONO` (Courier New BOLD 15px; bold keeps the
  strokes readable aliased). Flag mono on any new column-aligned doc.
  Rule of thumb: chrome text (buttons, menus, labels, lists, titles,
  status bars) stays bitmap W95F; anything a player READS at length is
  Arial — Courier bold only when columns matter. Do not put Fixedsys or
  scaled ms_sans_serif back on reading surfaces.
- In-game web pages: Times New Roman / Arial / Courier New via the `PageBlock`
  style system — that's what the 1997 web actually used.
- Font smoothing (owner call): EVERYTHING renders aliased — body-level
  `-webkit-font-smoothing: none` — with NO exceptions, the way a real 1997
  machine drew text. Readability comes from face, size, and line-height
  (vector faces alias cleanly), never from smoothing. Never add a
  smoothing carve-out, and never put scaled bitmap fonts on long-form
  reading surfaces.
- Reading surfaces get comfortable line-height (1.45–1.55) and ≥14px sizes;
  chrome stays compact at 13–14px.
- No webfonts beyond the three above. No variable fonts, no Inter/Roboto/system
  UI stacks.

### Icons & imagery
- Icons: TEMPORARY DEMO EXCEPTION (owner call) — most icons currently come
  from `@react95/icons` (genuine Win95 art) via the map in
  `src/os/icons.tsx`. They MUST be replaced with original art before any
  commercial release, and no Windows-flag icon may ever be used (several in
  that package carry the flag — audit any new pick). The hand-drawn SVG
  `<rect>` set in the same file is the fallback and the eventual
  replacement target; the long-term rule remains: original pixel art only,
  no icon libraries, no emoji as primary iconography.
- Images ship as SVGs styled like period photos/GIF banners (flat shapes,
  caption strips, dithered-dusk palettes). `image-rendering: pixelated` stays on.
- Cursors: OUR OWN pixel art (`src/assets/cursors/`, wired as CSS vars in
  `src/theme.tsx`) in the classic generic shapes — arrow everywhere
  (including buttons: Win95 never showed a hand on controls), I-beam on
  text, hand ONLY on in-game web links, and the hourglass via the
  `html.busy` class while an engine call runs long. Never ship extracted
  Microsoft .cur files; new cursor states use the same hand-drawn approach.
  Modern resize arrows on window edges are the accepted exception.
- Never reproduce real logos, trademarks, or brand lookalikes (no Windows flag,
  Netscape N, AOL, etc.).
- Naming policy: OS accessories use PLAIN GENERIC names, exactly like Win95 did
  (Calculator, Calendar, Notepad, Mail, Chat, Paint, CD Player, Clock, Picture
  Viewer). Fictional brands are only for things that were branded products or
  services in 1997: Microtech Horizons 95 (the OS — version 95, exactly like
  the real world's; the STORY year is 1997 and surfaces only through the
  machine itself: the boot stamp, the tray clock, the content. That gap is a
  deliberate difficulty knob for the login hint's "the year" — never
  rebrand the OS to 97), WestWind (ISP/email service),
  BuddyLine (the IM network Chat connects to), NetVoyager (browser), SearchHound (search), CityPages,
  MapFinder, Solar Flare (band), Meridian Digital
  Systems, Kava/Helios, Cosmoid/Prism.

### Sound
- Synthesized chip-style tones only (`src/os/sounds.ts`). Short, quiet,
  mutable. No sampled audio, no music beds, no modern notification sounds.
  THREE owner-approved exceptions: (1) the dial-up handshake plays a real
  sampled modem recording (`src/assets/sounds/dial-up-modem.mp3`) IN FULL
  (~26s, the staging is paced to it — anticipation is the point). A click
  skips and stops it cleanly; the chip-tone version is the fallback if
  playback is blocked. (2) Case Files handler messages may attach a voice
  recording (`audioSrc`, served from `public/audio/`) — reserved for
  important case moments, always with the transcript in the message lines.
  (3) Mail arrival plays the machine's own greeting sample
  (`youve_got_mail.mp3`) QUIET (~0.22 volume) — it is a computer sound,
  so it stays clean, no degradation; the chip chirp is its fallback.
  No other samples.

### Language & content
- In-world text never references anything after 1997 (no smartphones, social
  media, streaming, "google" as a verb, modern slang or meme formats).
- The in-world clock is frozen season data — never render the player's real
  date/time inside the fiction.
- Dialogue/writing style: era-authentic and human — typos, abbreviations,
  chain letters, guestbooks. Mundane beats suspicious; never add game-y UI
  (no glowing clues, no objective markers).
- The one sanctioned fourth-wall surface is quiet system feedback: the small
  discovery toast and the end-of-demo dialog. Player note-taking is diegetic:
  Notepad edits and saves real player documents to the desktop (saveDocument).
- NO first-boot welcome/tips box: this is Casey's long-lived account, not a
  fresh install — the machine greets nobody. Mechanical teaching belongs to
  the Case Files setup wizard (server content) and period-true affordances.
- Find: Files or Folders is engine-backed (`findFiles`): it walks only
  accessible, unlocked folders server-side, so it can never out-run gating.
  Keep it that way — no client-side file indexes, ever.

### Web pages (in-game)
- Author pages ONLY as `PageBlock` data in season content — never raw HTML
  (XSS surface) and never bespoke React pages.
- Keep 1997 web texture: visitor counters, "best viewed at 800x600",
  under-construction energy, table-era layouts, blue/underlined links.

### Live chat (in-game)
- Conversations are server-authored prompt trees (`ChatConversation` in
  season content). The player never types free text; the client only ever
  receives the prompts currently on offer, and the full transcript is
  rebuilt server-side from the ordered prompt history — never stored or
  invented client-side.
- Incoming lines appear stepped on a fixed clock (no typing animations, no
  easing). Chat notification copy in CLIENT code stays generic ("Someone
  just signed on.") — buddy names in client strings are spoiler leaks; the
  roster itself, populated from the server, does the telling.
- Buddy presence changes are authored as `overrides` on the roster entry
  (requirement → status, including `idle`), never client-side logic. Timed
  presence is a scheduled event setting a flag an override keys on.
- A buddy who messages FIRST is an `interjections` entry on the conversation
  (requirement-gated lines anchored into the rebuilt transcript) plus a
  scheduled event with an `im` wire notice — the client only opens the
  window and steps the new lines in.

### Dial-up (the online/offline mechanic)
- The core loop: OFFLINE = explore what Casey already had on the machine;
  ONLINE = the outside world can reach it again. The player dials in via
  Dial-Up Networking (WestWind Online) and can disconnect; the tray shows a
  modem icon while connected.
- The connection state is SERVER STATE (`PlayerState.online`), changed only
  by the engine's `connect`/`disconnect` actions. The client's dialing
  sequence and modem sound are pure theater — no app may keep a local
  online flag, and flipping anything client-side must never reveal content
  (the web, live chat, buddy presence, and mail delivery are all gated in
  the engine).
- Mail that "arrives" is authored with `arrivesOnline: true`: invisible
  until a delivery sweep runs while online AND its requires are met; once
  delivered it lives on the disk and reads fine offline. Sweeps run on
  connect and continuously while online. Going online CAN trigger story
  (that's the habit loop) but must not always — mundane connects are good.
- Anything TIMED is a `schedule` event in season content: fires once per
  season, N seconds into the current connection, requirement-gated, effects
  are FLAGS ONLY, with an optional server-authored wire notice. The client's
  10s online heartbeat (`checkMail`) is pure polling theater; client code
  never knows what an event means, only how to chirp/toast/refetch. Timed
  mail = event flag + an `arrivesOnline` item requiring it (attach a `mail`
  notice so it announces itself whatever action the sweep rides in on).
- The web loads SLOWLY on purpose: NetVoyager stages text in chunks and
  fills image frames one at a time — stepped, under ~2.5s, click-skippable,
  Stop keeps the partial page. Client theater only; never let load timing
  gate content.
- Email attachments are ordinary CHILD ITEMS of an email — ancestor-chain
  gating makes them exactly as visible as their mail. Clue-bearing images go
  through the authorized content path, never `public/`.
- The modem handshake is synthesized chip tones (~3s), click-skippable.
- The Phone Dialer shares the ONE phone line: dialing while online is
  refused by the ENGINE (`state.online`), and every number's outcome is
  season content (`phones`) — never client data. DTMF/ring sounds are
  chip-synth like everything else.

### MS-DOS mode & system mortality
- MS-DOS mode (Shut Down → "Restart in MS-DOS mode") is a real prompt whose
  every listing and TYPE goes through the ENGINE — content gating carries
  over automatically and no story text may live in DosMode.tsx. DOS-only
  clues are authored as content (e.g. `computer.dosVolume`), served via
  StateView.
- The blue screen is pure flavor: rare (random click budget, at most twice a
  session), silent, loses nothing, any key continues. Never let it interrupt
  an overlay (saver, dialogs, DOS, end card, remote session) and never make
  it a punishment.
- The remote-access takeover (`remoteAccess` in content) is a story
  set-piece: triggers on the event clock, stays pending until watched
  (reload replays it), and its ENTIRE script is engine-served — no story
  text in RemoteSession.tsx. Rendering is stepped (fixed per-character and
  per-line clocks), any input past the arming grace skips to the end, and
  acknowledging drops the connection. Threatening, never punishing.
- The Case Files app is the sanctioned diegetic frame (machine-is-evidence
  rules, handler reactions). Its memos AND its first-launch setup-wizard
  pages are `handler` season content served via `getCaseFile`; the app is
  chrome — any handler string in client code is a bundle leak. (The wizard's
  generic install-speak — "Connecting...", "Setup Complete" — is chrome and
  stays client-side.) Setup completes server-side (`caseFileSync`, which
  requires the line up and sets the engine flag `case-setup-done`), so the
  wizard runs exactly once per season. Handler messages may carry an
  `audioSrc` voice recording (owner-approved sampled exception, reserved
  for important moments — routine handler traffic is text; the message
  lines double as the transcript and playback must degrade to them
  gracefully).
- Workspace copies (`copyItem`) snapshot only the REDACTED text the player
  already received, from accessible unlocked items; copying an unread
  original applies its open effects. Copies are player documents; the
  original evidence stays immutable.

## Gameplay design pillars (see docs/gameplay-mechanics.md for the full list)
- The computer IS the world: the player learns things only from what is on
  (or reaches) this machine. Digital archaeology over puzzle boxes — the
  player is reconstructing a life, not opening arbitrary locks.
- Evidence is READ-ONLY; the player workspace is editable. Mutation actions
  (`saveDocument`, `moveDocument`, `renameItem`, `createFolder`) operate only
  on player-created documents in the engine — never let a change make story
  items alterable or deletable.
- Clue authoring: major discoveries should have MULTIPLE PATHS (treat
  `npm run validate` two-path warnings as a prompt, not noise); clues connect
  ACROSS apps (mail ↔ IM ↔ files ↔ photos ↔ web ↔ timestamps/filenames/DOS);
  CONTRADICTIONS are gameplay — author them deliberately and never resolve
  them for the player in the text; plant mundane artifacts early that later
  discoveries RECONTEXTUALIZE.
- The machine should feel alive: ambient events (new mail, IM sounds, buddy
  presence, occasional unexplained behavior) interrupt exploration. Anything
  timed or "live" is SERVER-authored and server-scheduled — never client
  timers that know story content. Images reach the player naturally (slow web
  pages, mail attachments), not via galleries or reward screens.
- The feature mechanics behind these pillars (scheduled events, live buddy
  list, slow web loading, attachments, remote-access DOS sequence, the Case
  File app, workspace copies) shipped under GitHub issues #2–#8; their rules
  live in the sections above and docs/gameplay-mechanics.md indexes them.

## Security model (non-negotiable, see README for detail)
- Story content lives ONLY in `supabase/functions/_shared/gamecore/` and the
  private `game` DB schema. It may reach the client exclusively through the
  engine's redacted DTOs.
- Never import `season1.ts` (or any content module) from `src/` outside the
  `import.meta.env.DEV`-guarded dev adapter path.
- Never put answers, requirements, passwords, or future-content strings in
  client code — including UI copy (the end-card once leaked a spoiler this way;
  render server-sent discovery text instead).
- After content/engine changes run: `npm run gen:seed` and `npm run verify`
  (build + tests + dist bundle-leak audit). All three must pass.
- Dev tools stay behind `import.meta.env.DEV` and must be dead-code-eliminated
  from production bundles.

## Engineering conventions
- Content is data; the engine is pure functions; the OS shell knows nothing
  about the story. Keep those three layers separate (they're what make future
  seasons possible).
- New apps register through `src/os/appRegistry.ts` (`registerApps.ts`); use
  the window store — don't hand-roll modals or portals for "windows".
- An app may declare a startup `splash` in its registry entry (see NetVoyager)
  rather than overlaying one itself.
- TypeScript strict; `npm run lint` (oxlint) warnings should not grow.
- react95 caveat: `Slider` (and anything relying on `findDOMNode`) crashes
  under React 19 — do not use it; prefer Select/NumberInput/buttons.
- Clue-graph tooling: `npm run validate` checks the content graph (dangling
  refs, ungrantable/unreachable discoveries and items, finale reachability,
  two-path warnings) and `npm run graph` regenerates `docs/clue-graph.md`
  (Mermaid) from the shipping content. Both run automatically inside
  `gen:seed`; `verify` runs validation first. Never hand-edit the graph doc.
