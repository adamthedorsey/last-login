# Gameplay mechanics & design pillars

The mechanics that define how Last Login plays. Each pillar is either a standing
design rule (enforce it in every change) or a feature with a tracked issue.
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
- **Case-handler framing** *(planned — [#7](https://github.com/adamthedorsey/last-login/issues/7))*:
  a persistent diegetic app establishes that the machine is evidence, sets the
  rules of engagement, and gives the player a voice to talk to.

## Evidence vs. workspace

- **Evidence is read-only.** Original files, messages, and photos can never be
  altered or deleted. The engine already enforces this: mutation actions
  (`saveDocument`, `moveDocument`, `renameItem`, `createFolder`) operate only
  on player-created documents.
- **The player workspace is editable.** Players take notes, organize clues, and
  save their own documents diegetically (Notepad → real files on the desktop).
- **Duplicating files into the workspace** *(planned — [#8](https://github.com/adamthedorsey/last-login/issues/8))*:
  copy an accessible evidence file into the player's folder as an editable
  snapshot, to collect and annotate clues.

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
- **The web loads slowly** *(planned — [#4](https://github.com/adamthedorsey/last-login/issues/4))*:
  pages and images visibly load with period-appropriate pacing — stepped,
  under ~2.5 s, always click-skippable.
- **Images arrive naturally** — mainly through slow-loading web pages and
  email attachments *(attachments planned — [#5](https://github.com/adamthedorsey/last-login/issues/5))*,
  not through a gallery or reward screen.

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
  after later discoveries (the screen saver text, the sticky note's signature).
  Plant mundane-looking evidence before its meaning arrives.

## The machine feels alive

- **Ambient story events** *(planned — [#2](https://github.com/adamthedorsey/last-login/issues/2))*:
  new mail, IM sounds, changed files, and connection activity can interrupt
  exploration via a server-side scheduled-event system. Today the only
  time-like mechanic is `arrivesOnline` mail sweeps.
- **Live buddy list** *(planned — [#3](https://github.com/adamthedorsey/last-login/issues/3))*:
  while online, contacts sign on/off, go idle, change away messages, and can
  initiate scripted conversations. Today presence is requirement-gated
  `overrides` only.
- **Remote-access sequence** *(planned — [#6](https://github.com/adamthedorsey/last-login/issues/6))*:
  a story set-piece where the GUI drops to DOS and someone accesses the
  machine remotely — threatening at first, later recontextualized as
  potentially an ally.

## Issue index

| # | Mechanic | Status |
|---|---|---|
| [#2](https://github.com/adamthedorsey/last-login/issues/2) | Scheduled/timed ambient event system (engine) | open |
| [#3](https://github.com/adamthedorsey/last-login/issues/3) | Live buddy list dynamics | open |
| [#4](https://github.com/adamthedorsey/last-login/issues/4) | Slow web page/image loading | open |
| [#5](https://github.com/adamthedorsey/last-login/issues/5) | Email attachments | open |
| [#6](https://github.com/adamthedorsey/last-login/issues/6) | Remote-access DOS sequence | open |
| [#7](https://github.com/adamthedorsey/last-login/issues/7) | Case-handler / helper app | open |
| [#8](https://github.com/adamthedorsey/last-login/issues/8) | Duplicate files into player workspace | open |

Everything else above is already implemented or is a standing authoring rule.
