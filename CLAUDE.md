# Last Login — project rules

A 1997 desktop mystery game. The player investigates a preserved teenager's PC.
Full architecture in README.md. These rules exist so nothing breaks the period
illusion or the security model. Follow them for EVERY change.

## The Period Guard: it must look, sound, and behave like 1997

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

### Motion
- No smooth/eased animations, no fades, no springs, no smooth scrolling.
  Things appear, disappear, and snap. Allowed motion: marquee text, a blinking
  block cursor, throbber/progress loops, instant window operations, and the
  screen saver (constant-velocity linear drift + stepped sprite frames only —
  no easing, ever).
- Deliberate slowness is flavor (dial-up delays, splash screens) — keep each
  under ~2.5s and always click-skippable. One exception: the cold-boot POST
  runs ~6s with uneven, machine-like timing (memory count-up, IDE pause) —
  it too must stay click-skippable.

### Typography
- OS chrome: `ms_sans_serif` bitmap font (from react95). Don't introduce other
  UI fonts.
- TERMINAL surfaces (boot/POST, MS-DOS mode, blue screen, shutdown): Fixedsys
  — use `PIXEL_MONO` from `src/theme.tsx`, at 16px (its crisp native size;
  multiples of 16 only). Short, large, atmospheric text only.
- LONG-FORM machine text is deliberately easier on modern eyes (creative
  license, owner-approved): Notepad documents and recovered logs use
  `DOC_TEXT` from `src/theme.tsx` (Courier New 15px/1.5 — monospace is
  load-bearing: story documents contain column-aligned ASCII like the
  ledger). Email bodies read in Arial 14px/1.6 — what Outlook Express
  actually rendered mail in; the bitmap chrome font scales badly in long
  paragraphs (never put column-aligned evidence in mail bodies). Do not put
  Fixedsys or scaled ms_sans_serif back on reading surfaces.
- In-game web pages: Times New Roman / Arial / Courier New via the `PageBlock`
  style system — that's what the 1997 web actually used.
- Font smoothing is ONE tier, on purpose (owner call): EVERYTHING renders
  aliased — body-level `-webkit-font-smoothing: none`, no opt-outs — the way
  a real 1997 machine drew text. Readability comes from FACE, SIZE, and
  LINE-HEIGHT, never from smoothing: vector faces (Arial, Courier New,
  Times) alias cleanly at 14px+; only SCALED BITMAP fonts go ragged, so
  ms_sans_serif/Fixedsys never appear on long-form reading surfaces.
- Reading surfaces get comfortable line-height (1.45–1.55) and ≥14px sizes;
  chrome stays compact at 13–14px.
- No webfonts beyond the three above. No variable fonts, no Inter/Roboto/system
  UI stacks.

### Icons & imagery
- All icons are original pixel art: SVG `<rect>` compositions with
  `shape-rendering: crispEdges` (see `src/os/icons.tsx`). No icon libraries,
  no emoji as primary iconography, no smooth vector illustration in OS chrome.
- Images ship as SVGs styled like period photos/GIF banners (flat shapes,
  caption strips, dithered-dusk palettes). `image-rendering: pixelated` stays on.
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
  (requirement → status), never client-side logic.

### MS-DOS mode & system mortality
- MS-DOS mode (Shut Down → "Restart in MS-DOS mode") is a real prompt whose
  every listing and TYPE goes through the ENGINE — content gating carries
  over automatically and no story text may live in DosMode.tsx. DOS-only
  clues are authored as content (e.g. `computer.dosVolume`), served via
  StateView.
- The blue screen is pure flavor: rare (random click budget, at most twice a
  session), silent, loses nothing, any key continues. Never let it interrupt
  an overlay (saver, dialogs, DOS, end card) and never make it a punishment.

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
