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
  under ~2.5s and always click-skippable.

### Typography
- OS chrome: `ms_sans_serif` bitmap font (from react95). Don't introduce other
  UI fonts.
- Machine-local text (Notepad, boot/shutdown screens, email bodies): Fixedsys —
  use `PIXEL_MONO` from `src/theme.tsx`, at 16px (its crisp native size;
  multiples of 16 only).
- In-game web pages: Times New Roman / Arial / Courier New via the `PageBlock`
  style system — that's what the 1997 web actually used.
- Font smoothing is two-tier, on purpose: bitmap fonts (ms_sans_serif,
  Fixedsys) render ALIASED (smoothing off inherits from body — their crisp,
  correct form). Vector reading faces (Times/Arial content surfaces) opt back
  into antialiasing via `READABLE_TEXT` from `src/theme.tsx` — period feel
  must not make long story text hard to read. Never smooth the bitmap fonts;
  never leave a long-form vector-text surface aliased.
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
  services in 1997: Microtech Horizons (OS), WestWind (ISP/email service),
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
