# Gameplay mechanics & design pillars

The mechanics that define how Last Login plays. Each pillar is a standing
design rule — enforce it in every change. The feature mechanics below were
built under issues [#2](https://github.com/adamthedorsey/last-login/issues/2)–[#8](https://github.com/adamthedorsey/last-login/issues/8);
the issue links carry the design rationale and constraints for each.
Architecture details live in the README; period/security rules in CLAUDE.md.

## The frame

- **The computer is the world.** The player investigates Casey's disappearance
  entirely through her 1997 PC. There is no world outside the machine — no
  cutscenes, no narrator, no map. If the player learns something, they learned
  it from something on (or reaching) this computer.
- **Digital archaeology over puzzle boxes.** The player is a detective
  reconstructing a real person's life, not solving arbitrary locks. Passwords
  and gating exist, but the dominant activity is reading, comparing, and
  inferring. Mundane beats suspicious; nothing glows.
- **Case-handler framing**
  ([#7](https://github.com/adamthedorsey/last-login/issues/7)): the Case File
  app — the evidence viewer the sheriff's office installed — establishes that
  the machine is evidence, sets the rules of engagement, and reacts to
  progress. Every memo is season content (`handler` in the content model)
  served through `getCaseFile`; the app itself is pure chrome.

## Evidence vs. workspace

- **Evidence is read-only.** Original files, messages, and photos can never be
  altered or deleted. The engine enforces this: mutation actions
  (`saveDocument`, `moveDocument`, `renameItem`, `createFolder`) operate only
  on player-created documents.
- **The player workspace is editable.** Players take notes, organize clues, and
  save their own documents diegetically (Notepad → real files on the desktop).
- **Copying into the workspace**
  ([#8](https://github.com/adamthedorsey/last-login/issues/8)): `copyItem`
  snapshots any accessible, unlocked, text-bearing item (documents, emails
  with their envelope, saved IM logs, recovered trash files) into an editable
  "Copy of ..." player document — Explorer/Recycle Bin context menus and the
  Mail toolbar. Copies store only redacted text the player already received;
  copying an unread original counts as reading it.

## Online / offline

- **The connection state matters.** Offline = what Casey already had (local
  files, saved mail, old IM logs). Online = the outside world can reach the
  machine again (the web, new mail delivery, buddy presence, live IM). The
  state is server-authoritative (`PlayerState.online`); all content gating on
  it lives in the engine.
- **Dial-up is an interaction, not a toggle.** Connecting has sounds, delay,
  and staging; the one phone line is shared (the Phone Dialer is refused while
  online); the tray shows the modem. Going online *can* trigger story but must
  not always — mundane connects keep the habit loop honest.
- **The web loads slowly**
  ([#4](https://github.com/adamthedorsey/last-login/issues/4)): NetVoyager
  stages every page — text blocks arrive top-down in chunks, images fill
  their empty frames one at a time. Stepped (never eased), under ~2.5 s,
  always click-skippable, and Stop keeps the partial page. Pure client
  theater: timing never gates content.
- **Images arrive naturally** — through slow-loading web pages and email
  attachments ([#5](https://github.com/adamthedorsey/last-login/issues/5)):
  attachments are ordinary child items of an email, so ancestor-chain gating
  makes them exactly as visible as their mail. Never a gallery or reward
  screen.

## Clue design (content-authoring rules)

- **Multiple paths to important clues.** Major discoveries should rarely hang
  on finding one exact artifact. `npm run validate` warns on single-path
  discoveries; treat those warnings as a prompt to author a second route.
- **Cross-app clues.** Information connects across email, IM, documents,
  photos, websites, timestamps, filenames, and BIOS/DOS surfaces. A thread
  that lives entirely inside one app is usually a missed opportunity.
- **Contradictions are gameplay.** Players infer truth by comparing
  conflicting accounts, dates, photos, messages, and metadata. Author the
  contradiction deliberately (see `story/who-knows-what.md`); never resolve it
  for the player in the text.
- **Recontextualization.** Ordinary artifacts seen early become important
  after later discoveries (the screen saver text, the sticky note's signature,
  Angel's chain letters). Plant mundane-looking evidence before its meaning
  arrives.

## The machine feels alive

- **Ambient story events**
  ([#2](https://github.com/adamthedorsey/last-login/issues/2)): the engine
  sweeps a content-authored `schedule` while the player is online — each
  event fires once per season, N seconds into the current connection, gated
  by the usual requirement trees. Effects are **flags only**; mail arrival,
  presence, and chat all hang off those flags through normal gating. Fired
  events stamp server-authored wire notices onto the result; the client
  heartbeats every 10 s while online, then chirps, toasts, and refetches
  without knowing what any event means. Author mundane events as well as
  story events.
- **Live buddy list**
  ([#3](https://github.com/adamthedorsey/last-login/issues/3)): while online,
  contacts sign on/off, go **idle**, change away messages (all via
  event-flag `overrides`), and can message FIRST — `interjections` on a
  conversation are requirement-gated lines the buddy volunteers, anchored
  into the rebuilt transcript; an `im` wire notice opens their window.
- **Remote-access sequence**
  ([#6](https://github.com/adamthedorsey/last-login/issues/6)): a story
  set-piece where the GUI drops and someone dials INTO the machine. Authored
  as `remoteAccess` content: triggers on the event clock, stays pending
  (reload-proof) until the client plays the engine-served script and
  acknowledges, which applies the authored effects and drops the connection.
  Threatening, not punishing: nothing is lost.

## Mechanics status

| # | Mechanic | Status |
|---|---|---|
| [#2](https://github.com/adamthedorsey/last-login/issues/2) | Scheduled/timed ambient event system (engine) | shipped |
| [#3](https://github.com/adamthedorsey/last-login/issues/3) | Live buddy list dynamics | shipped |
| [#4](https://github.com/adamthedorsey/last-login/issues/4) | Slow web page/image loading | shipped |
| [#5](https://github.com/adamthedorsey/last-login/issues/5) | Email attachments | shipped |
| [#6](https://github.com/adamthedorsey/last-login/issues/6) | Remote-access DOS sequence | shipped |
| [#7](https://github.com/adamthedorsey/last-login/issues/7) | Case-handler / helper app (Case File) | shipped |
| [#8](https://github.com/adamthedorsey/last-login/issues/8) | Copy files into player workspace | shipped |

Open follow-on ideas that came out of this work: an ally-flavored second
remote-access sequence (the issue's original "later revealed to potentially
be an ally" beat), restoring/deleting workspace copies through the Recycle
Bin, and per-image interlaced reveal in NetVoyager.
