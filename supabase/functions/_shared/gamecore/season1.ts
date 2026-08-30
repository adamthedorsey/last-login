/**
 * SEASON 1 — "Without a Trace" — Humble, West Virginia, October 1997.
 *
 * SERVER-ONLY STORY DATA. This module is imported by the Supabase Edge
 * Function and (in local development only) by the dev in-browser adapter.
 * It must never be reachable from a production client bundle — the
 * `check:bundle` script enforces this.
 *
 * Canon: story/truth-timeline.md and story/who-knows-what.md (SPOILERS).
 * The machine belongs to Casey Taylor, 16. She has been missing since
 * Friday, October 10. The in-world clock is frozen at Saturday, October 18,
 * 9:47 PM — the night someone finally sits down at her computer.
 *
 * Clue chain (see docs/clue-graph.md, regenerated from this file). Every
 * non-finale discovery has TWO independent routes (two-path rule) — path A
 * is the mail/file spine, path B spreads across live chat, the web, and
 * the filesystem so missing one app never soft-locks the season:
 *  ACT 1  the-meeting        A: sadie's email          B: live chat w/ sadie
 *         stolen-intimacy    A: recovered IM log       B: "poem drafts 2.txt"
 *  ACT 2  chads-window       A: sadie's 2nd email      B: Register timeline page
 *         the-clean-truck    A: aunt ruth's email      B: live chat (sadie saw frank)
 *  ACT 3  the-pipeline       A: hidden ledger copy     B: sam reed's 2nd letter
 *         who-shaped         A: rebecca's email        B: live chat (woman at the vigil)
 *         the-house          the deleted diary — single-path finale, by design
 *  EPILOGUE  GhostBridge signs on. Say the word. Watch him run.
 */

import type { SeasonContent } from './types.ts';
import { generateNeighborhood } from './webgen.ts';

// Procedurally generated GeoCities-style filler web (fixed seed = stable
// world). Casey's and Sadie's hand-authored pages headline the directory.
const GENERATED_WEB = generateNeighborhood(19971018, 8, [
  { title: "~*~ casey's corner ~*~", url: 'www.citypages.net/~sunflwrc81' },
  { title: "sadie draws (sometimes)", url: 'www.citypages.net/~sadiedraws77' },
]);

export const SEASON1: SeasonContent = {
  slug: 'season-1',
  title: 'Last Login — Season 1: Without a Trace',
  clock: { now: '1997-10-18T21:47:00' },
  computer: {
    owner: 'Casey Taylor',
    loginUser: 'casey',
    loginTargetId: 'login.casey',
    // The hint CASEY typed when she set her password. The OS offers it only
    // after three wrong guesses — the login is the game's first puzzle.
    // (The readme on the desktop still carries J's "i guessed it in one
    // try" — which lands differently once you've needed the hint.)
    loginHint: 'moms flower + the year',
    // Casey set her screen saver text herself. It floats there whenever the
    // machine idles — which means everyone in the house has seen it.
    saverText: 'junebug',
    imScreenname: 'SunflwrC81',
    // The machine's first ambient clue, shown on every cold boot — before
    // the player knows anything. Whoever used this PC at 2:14 AM on Oct 11
    // didn't shut it down. They cut the power at 2:31 and walked away.
    // (The diary's file properties corroborate the window, much later.)
    bootWarning: [
      'WARNING: This computer was not shut down properly.',
      'Last session ended:  10/11/97  2:31 AM',
    ],
    // Shown by `vol` and `dir` in MS-DOS mode. The serial reads as line
    // noise on day one — and as the finale's timestamp (2:14 AM, Oct 11)
    // to anyone who thinks to look at it twice.
    dosVolume: { label: 'CASEY', serial: '2141-1011' },
  },
  passwords: {
    'login.casey': { password: 'sunflower97' },
  },
  wallpaper: 'teal',
  homeUrl: 'www.searchhound.net',
  // Six strikes and the machine freezes you out for a minute and a half.
  // What the phone line reaches when the modem ISN'T holding it. Flavor,
  // not clues — but the time line reads the frozen clock back to you, and
  // dialing the WestWind access number by voice gets you screamed at by a
  // modem. The speed-dial labels are Casey's own programming.
  phones: [
    {
      number: '5550101',
      label: 'time + temp',
      outcome: 'message',
      message: [
        'Thank you for calling the First Bank of Humble time and temperature line.',
        'The time is... 9:47 PM.',
        'The temperature is... 52 degrees.',
        'First Bank of Humble. Your neighbors since 1924.',
      ],
    },
    { number: '5550119', label: 'sadie', outcome: 'no-answer' },
    { number: '5550177', label: 'moms work', outcome: 'busy' },
    {
      number: '5550134',
      outcome: 'message',
      carrier: true,
      message: ['A shriek of carrier tone answers. On the other end, a modem is listening.'],
    },
  ],
  maxPasswordAttempts: 6,
  lockoutSeconds: 90,

  discoveries: [
    {
      id: 'the-meeting',
      title: 'The meeting',
      description:
        'Casey told Sadie she was meeting someone the night of the 10th — down by the river — and wouldn’t say who. Nobody in her life knows who.',
    },
    {
      id: 'stolen-intimacy',
      title: 'Stolen intimacy',
      description:
        'GhostBridge proved himself with things from inside Casey’s private world — words nobody outside it could know. He didn’t earn her trust. He read it.',
    },
    {
      id: 'chads-window',
      title: 'Chad’s window',
      description:
        'Chad spent that whole week begging to know who Casey was talking to online — and spent the night of the 10th on a barstool at Gene’s. You don’t get jealous of yourself.',
    },
    {
      id: 'the-clean-truck',
      title: 'The clean dark truck',
      description:
        'Frank saw a quiet, clean 4x4 stop at the bend that night. Chad’s lifted truck can be heard three streets away — and Frank knows every engine in this county.',
    },
    {
      id: 'the-pipeline',
      title: 'The pipeline',
      description:
        'Dr. Sparks writes them. Value-Med fills them. Cash, strangers’ initials, license plates from three counties away. That’s what Casey found — and what somebody needed her not to have found.',
    },
    {
      // Granted by watching the remote-access set-piece (single-path by
      // design — it is an event that happens TO the player, not a puzzle).
      id: 'the-watcher',
      title: 'The watcher',
      description:
        'Someone just dialed into this machine like they’d done it a hundred times — no guessing, no fumbling, straight to her private folder, looking for one file that is no longer there. That is how you know things nobody posted, and quote files that live nowhere else. It was never magic. It was access.',
    },
    {
      id: 'who-shaped',
      title: 'A familiar shape',
      description:
        'Rebecca Wright’s first husband used to read her mail and answer it in her own voice. She recognizes the pattern. Now so do you.',
    },
    {
      id: 'the-house',
      title: 'The house',
      description:
        'Someone used this computer at 2:14 AM on October 11 — hours after Casey disappeared. They read her diary, and then they deleted it. They didn’t break in. They were already home.',
      endsDemo: true,
    },
  ],

  buddies: [
    {
      screenname: 'sadiedraws77',
      alias: 'sadie',
      group: 'Buddies',
      status: 'online',
      conversationId: 'im.sadie',
      // She falls quiet late in a long session — watching her own screen,
      // same as you. (Idle buddies still answer; they were just staring.)
      overrides: [{ requires: { flag: 'sadie-gone-quiet' }, status: 'idle' }],
    },
    {
      screenname: 'AngelJx',
      alias: 'angel',
      group: 'Buddies',
      status: 'away',
      awayMessage: 'grounded. 4ever apparently.',
      conversationId: 'im.angel',
      // A couple of minutes in she risks it and flips properly online —
      // until her mom's footsteps put the away message back up, reworded.
      overrides: [
        { requires: { flag: 'angel-risking-it' }, status: 'online' },
        {
          requires: { flag: 'angel-mom-came-in' },
          status: 'away',
          awayMessage: "MOM I'M DOING HOMEWORK. (i am not doing homework)",
        },
      ],
    },
    {
      screenname: 'BigChad4x4',
      alias: 'chad',
      group: 'Buddies',
      status: 'offline',
    },
    {
      screenname: 'GhostBridge',
      group: 'Buddies',
      status: 'offline',
      // His logs are gone from the messenger. One copy survived elsewhere.
      requires: { discovery: 'stolen-intimacy' },
      // The epilogue: minutes after the player learns about the 2:14 AM
      // login, he signs on — someone noticed activity on this machine.
      // Say the word to him and he signs off for good.
      overrides: [
        { requires: { discovery: 'the-house' }, status: 'online' },
        { requires: { flag: 'ghost-signoff' }, status: 'offline' },
      ],
    },
  ],

  // The one-phone-line scare: once the player knows who shaped the lie,
  // the next time they're online somebody in the house picks up the
  // extension and kills the connection. Once. (They're not alone.)
  linePickup: { requires: { discovery: 'who-shaped' } },

  // =========================================================================
  // SCHEDULED EVENTS — the machine lives a little while the line is up.
  // Effects are flags only; mail/presence/chat hang off them through the
  // normal gating machinery. Each fires once per season, N seconds into a
  // connection. Mundane beats suspicious: not everything here is story.
  // =========================================================================
  schedule: [
    {
      // A couple of minutes in, Angel decides her mom is probably asleep
      // and flips from away to properly online. The roster doorbell rings.
      id: 'evt.angel-on',
      afterOnlineSeconds: 150,
      setFlags: { 'angel-risking-it': true },
      notice: { kind: 'buddy-on' },
    },
    {
      // If the player has introduced themselves to Sadie, she messages
      // FIRST a few minutes later — the window opens itself, 1997-style.
      id: 'evt.sadie-knock',
      afterOnlineSeconds: 240,
      requires: { flag: 'sadie-talking' },
      setFlags: { 'sadie-checked-in': true },
      notice: { kind: 'im', screenname: 'sadiedraws77' },
    },
    {
      // Seven minutes into any session, Angel — who has been watching that
      // buddy list all week — sends the machine another chain letter. Grief
      // does what grief does. (And read again after the finale: she wasn't
      // the only one who noticed this machine signing on at night.)
      id: 'evt.angel-forward',
      afterOnlineSeconds: 420,
      setFlags: { 'angel-sent-luck': true },
      notice: { kind: 'mail' },
    },
    {
      // Footsteps in the hallway: Angel's away message goes back up,
      // reworded. Silent — the roster just quietly changes.
      id: 'evt.angel-caught',
      afterOnlineSeconds: 540,
      requires: { flag: 'angel-risking-it' },
      setFlags: { 'angel-mom-came-in': true },
      notice: { kind: 'roster' },
    },
    {
      // Ten minutes in, Sadie goes idle. Nothing happened. She is sixteen
      // and it is late and her best friend is missing.
      id: 'evt.sadie-idle',
      afterOnlineSeconds: 600,
      setFlags: { 'sadie-gone-quiet': true },
      notice: { kind: 'roster' },
    },
    {
      // THE EPILOGUE DOORBELL. Minutes after the player learns about the
      // 2:14 AM login, GhostBridge signs on — someone noticed activity on
      // this machine. (His roster entry is gated on the same discovery.)
      id: 'evt.ghost-on',
      afterOnlineSeconds: 0,
      requires: { discovery: 'the-house' },
      notice: { kind: 'buddy-on' },
    },
  ],

  // =========================================================================
  // REMOTE ACCESS — the Act 3 set-piece. A minute after the player has the
  // pipeline (someone's whole crime, sitting in a school folder), the GUI
  // drops and a practiced hand dials in: checks the volume, goes straight
  // to `personal stuff`, asks for one file that is no longer there, says
  // goodnight, hangs up. This is HOW GhostBridge always knew — the same
  // session the modem log has been recording at 11-something every night.
  // Watching it earns `the-watcher` and costs the connection.
  // =========================================================================
  remoteAccess: [
    {
      id: 'remote.ghost-checkin',
      afterOnlineSeconds: 60,
      requires: { discovery: 'the-pipeline' },
      script: [
        { t: 'sys', text: 'HZLINK 1.2 remote console — carrier 28800' },
        { t: 'sys', text: 'supervisor session (no password required)' },
        { t: 'sys', text: '' },
        { t: 'pause', ms: 1100 },
        { t: 'cmd', text: 'C:\\>vol' },
        {
          t: 'out',
          lines: [' Volume in drive C is CASEY', ' Volume Serial Number is 2141-1011', ''],
        },
        { t: 'pause', ms: 700 },
        { t: 'cmd', text: 'C:\\>cd my documents\\personal stuff' },
        { t: 'cmd', text: 'C:\\MY DOCUMENTS\\PERSONAL STUFF>dir diary.doc' },
        { t: 'pause', ms: 500 },
        { t: 'out', lines: ['File not found', ''] },
        { t: 'pause', ms: 2000 },
        { t: 'cmd', text: 'C:\\MY DOCUMENTS\\PERSONAL STUFF>echo goodnight' },
        { t: 'out', lines: ['goodnight', ''] },
        { t: 'pause', ms: 900 },
        { t: 'cmd', text: 'C:\\MY DOCUMENTS\\PERSONAL STUFF>exit' },
        { t: 'sys', text: '' },
        { t: 'sys', text: 'NO CARRIER' },
        { t: 'pause', ms: 1400 },
      ],
      onDone: { discover: ['the-watcher'], setFlags: { 'watched-remote': true } },
    },
  ],

  // =========================================================================
  // CASE HANDLER — the frame. The machine sits in the sheriff's office; the
  // player is the unofficial pair of eyes Purvis can't spare a deputy for.
  // His memos establish the rules (originals are evidence, notes are yours,
  // dialing out is authorized) and react to progress. Whether "keep it on
  // the machine" is protection or a leash is never resolved in the text —
  // contradictions are gameplay.
  // =========================================================================
  handler: {
    title: 'CASE 97-0244 — TAYLOR, CASEY A. — MISSING',
    messages: [
      {
        id: 'hm.readfirst',
        date: '1997-10-18',
        from: 'D. Purvis, Sheriff',
        subject: 'READ FIRST',
        lines: [
          "The Taylor girl's computer is in this office as of Thursday.",
          'Officially it has been examined. Officially there was nothing',
          'on it.',
          '',
          'I have one deputy with a bad hip and a state lab that quotes me',
          'six weeks. You asked to look. So look.',
          '',
          'Ground rules, and this software will hold you to them:',
          '',
          '  1. Original files are evidence. You can read them. You cannot',
          '     change them. The software sees to that.',
          '  2. Keep your own notes in her Notepad. What you save is yours',
          '     and stays separate from the evidence.',
          '  3. The WestWind account is paid through November. Dialing in',
          '     on her line is authorized. Watch who you talk to out there.',
          '',
          'Anything that matters, write it down. Everything you open, I',
          'hear about. Work like somebody is watching.',
          '',
          '- D.P.',
        ],
      },
      {
        id: 'hm.river',
        date: '1997-10-18',
        from: 'D. Purvis, Sheriff',
        subject: 're: the river',
        requires: { discovery: 'the-meeting' },
        lines: [
          'So she was meeting somebody. That much we had from the Thompson',
          'girl in week one. WHO is the whole case.',
          '',
          'Keep to the machine. Do not go interviewing my county.',
          '',
          '- D.P.',
        ],
      },
      {
        id: 'hm.careful',
        date: '1997-10-18',
        from: 'D. Purvis, Sheriff',
        subject: '(no subject)',
        requires: { discovery: 'the-pipeline' },
        lines: [
          'I got your meaning. Stop.',
          '',
          'Listen to me now. Do not print that page. Do not speak that',
          'name to a living soul in this county until I say so. Some names',
          'here buy their own weather.',
          '',
          'Keep it on the machine. I mean it.',
          '',
          '- D.P.',
        ],
      },
      {
        id: 'hm.dialin',
        date: '1997-10-18',
        from: 'D. Purvis, Sheriff',
        subject: 're: the session',
        requires: { discovery: 'the-watcher' },
        lines: [
          'Say that again. Somebody dialed IN?',
          '',
          'Nothing in this case file says that machine takes calls. I am',
          'going to find out who set that up. Until I do, you and I never',
          'had this conversation.',
          '',
          'Log everything. Touch nothing. Keep the line unplugged when you',
          'are not using it.',
          '',
          '- D.P.',
        ],
      },
      {
        id: 'hm.callme',
        date: '1997-10-18',
        from: 'D. Purvis, Sheriff',
        subject: 'CALL THE OFFICE',
        requires: { discovery: 'the-house' },
        lines: [
          'Enough. Call the office. Ask for me and nobody else.',
          '',
          'Do not use the machine again tonight. Do not tell the family',
          'anything yet.',
          '',
          'You did what the six-week lab could not, and I am sorry for',
          'what it cost you to learn it.',
          '',
          'Now call.',
          '',
          '- D.P.',
        ],
      },
    ],
  },

  // =========================================================================
  // LIVE CONVERSATIONS — Oct 18, 9:47 PM. The player is signed on as Casey.
  // Sadie has spent the week investigating on her own (see story docs); her
  // branches are path B for three discoveries. Every prompt is one-shot.
  // =========================================================================
  conversations: [
    {
      screenname: 'sadiedraws77',
      // She has been watching that buddy list all week. The second
      // SunflwrC81 goes active, she messages.
      opener: [
        'casey???',
        'casey oh my god. ur online. say something',
        '…you’re not her. are you. she never just sits there.',
      ],
      prompts: [
        {
          id: 'intro',
          text: 'this isn’t casey. i’m at her computer, trying to find out what happened.',
          setFlags: { 'sadie-talking': true },
          discover: ['the-meeting'],
          replies: [
            'ok.',
            'ok. i don’t know who you are. police, family, whoever.',
            'if you’re at her desk you’re in her HOUSE. i’m deciding right now not to think too hard about that. because nobody else is LOOKING. the police think she ran off or fell in the river and they’re wrong both times.',
            'so listen. thursday night, on her porch, she told me she was meeting someone friday. down by the river. she wouldn’t say who. “it’s a whole thing, i’ll tell you saturday.” she was excited and scared at the same time.',
            'she tells me everything. since second grade. and she wouldn’t tell me this. that’s the part that keeps me up.',
          ],
        },
        {
          id: 'online-guy',
          text: 'did she say anything about who she was talking to online?',
          requires: { all: [{ flag: 'sadie-talking' }, { discovery: 'the-meeting' }] },
          replies: [
            'no. and i ASKED. she’d go all careful. “i want to be sure first.”',
            'chad was losing his mind about it. kept cornering me in the hall like i was hiding a guy in my backpack.',
            'whoever it was, she didn’t act like it was romantic. she acted like it was important. those are different faces on casey.',
          ],
        },
        {
          id: 'frank',
          text: 'could it have been her dad she was meeting?',
          requires: { all: [{ flag: 'sadie-talking' }, { discovery: 'chads-window' }] },
          discover: ['the-clean-truck'],
          replies: [
            'frank? no. and i can sort of prove it.',
            'i biked out to his trailer wednesday. everybody acts like he’s a monster. he’s just sad, and drunk, and he skips rocks at the river alone like it still counts.',
            'he told me something he won’t tell the sheriff. friday night, around ten, he watched a vehicle come up the fire road and stop at the bend. dark 4x4. CLEAN. quiet. sat there with the lights off.',
            'he said “it wasn’t the daniels boy. that truck of his you can hear from the church.” he knows every engine in this county. it’s his one thing.',
            'somebody who washes his car was at the bend that night. write that down, whoever you are.',
          ],
        },
        {
          id: 'vigil',
          text: 'has anyone strange been around since she disappeared?',
          requires: { all: [{ flag: 'sadie-talking' }, { discovery: 'the-pipeline' }] },
          discover: ['who-shaped'],
          replies: [
            'how did you— ok. yes. one thing.',
            'friday at st mark’s a woman stood at the very back. older. nice coat. not from here. and after, she came up to ME. of everybody.',
            'she asked if casey had been “writing to someone who sounded exactly right.” word for word. EXACTLY RIGHT.',
            'she said to watch casey’s mail, and if a letter ever comes from an r. wright — believe it. then she left before the last hymn.',
            'i didn’t understand it then. i think maybe you do.',
          ],
        },
        {
          id: 'about-her',
          text: 'what was casey like?',
          requires: { flag: 'sadie-talking' },
          replies: [
            'the kind of person who keeps the drawing you made her in second grade.',
            'she has a code word with me. for if things ever got Actually Bad. i’m not telling you what it is. it’s ours.',
            'just don’t stop halfway, ok? whatever you find. she wouldn’t.',
          ],
        },
      ],
      interjections: [
        {
          // evt.sadie-knock: she messages first, a few minutes after the
          // introduction. Anchored after the intro exchange.
          id: 'knock1',
          afterPromptId: 'intro',
          requires: { flag: 'sadie-checked-in' },
          lines: [
            'you still there?',
            'sorry. i keep remembering things and typing at you is better than staring at the ceiling.',
            'ask me whatever. i mean it. nobody else is asking.',
          ],
        },
      ],
    },
    {
      screenname: 'AngelJx',
      opener: [
        'Auto response from AngelJx: grounded. 4ever apparently.',
        'ok i’m actually here. if my mom hears typing i’m dead. who is this. casey’s mom??',
      ],
      prompts: [
        {
          id: 'friday',
          text: 'i’m looking through casey’s computer. what really happened friday?',
          setFlags: { 'angel-talking': true },
          replies: [
            'did sadie put you up to this. whatever. i already told the police the real version, ok.',
            'we were at the back lot behind gene’s. wine coolers. my cousin got them for us. i said i dropped her home at 8 instead of 7 because of his JOB, and now the whole town acts like i buried her.',
            'i dropped her at 7. i WATCHED her walk in her own front door. whatever happened to casey happened after her own front door. nobody wants to think about that. but it’s true.',
          ],
        },
        {
          id: 'chain-letter',
          text: 'she kept your chain letter. it’s still on the computer.',
          requires: { flag: 'angel-talking' },
          replies: [
            'the good luck angel?? she SAVED it???',
            'ok. i’m crying at the computer desk. great. cool.',
            'when she comes back i’m sending her ten more. tell her that. word for word.',
          ],
        },
      ],
    },
    {
      // THE EPILOGUE. He signs on minutes after the player learns about the
      // 2:14 AM login. He noticed someone on this machine. He always notices.
      screenname: 'GhostBridge',
      requires: { discovery: 'the-house' },
      opener: ['you’re up late.'],
      prompts: [
        {
          id: 'pretend',
          text: 'couldn’t sleep.',
          replies: ['no. i don’t imagine you could.', 'whoever you are.'],
        },
        {
          id: 'who',
          text: 'who is this?',
          replies: ['a friend of the family.'],
        },
        {
          // The code word means "come get me, no questions." In his mouth it
          // was a leash. In yours it's a mirror. He runs from it.
          id: 'junebug',
          text: 'junebug.',
          replies: [],
          signOff: true,
          setFlags: { 'ghost-signoff': true },
        },
      ],
    },
  ],

  items: [
    // =====================================================================
    // FILESYSTEM
    // =====================================================================
    {
      // The Win95 front door: drives and system folders live inside.
      id: 'folder.computer',
      kind: 'folder',
      name: 'My Computer',
      icon: 'mycomputer',
      meta: { desktop: { x: 24, y: 24 } },
    },
    {
      id: 'drive.a',
      kind: 'folder',
      name: '3½ Floppy (A:)',
      icon: 'floppy',
      parentId: 'folder.computer',
      // No disk in the drive — the Explorer shows the classic refusal.
      meta: { path: 'A:\\' },
    },
    {
      id: 'folder.c',
      kind: 'folder',
      name: 'Casey (C:)',
      icon: 'drive',
      parentId: 'folder.computer',
      meta: { path: 'C:\\' },
    },
    {
      id: 'cpl.dialup',
      kind: 'shortcut',
      name: 'Dial-Up Networking',
      icon: 'dialup',
      parentId: 'folder.computer',
      meta: { appId: 'dialup' },
    },
    {
      // A real Control Panel folder of applets — all machine chrome.
      id: 'folder.cpanel',
      kind: 'folder',
      name: 'Control Panel',
      icon: 'settings',
      parentId: 'folder.computer',
    },
    { id: 'cpl2.addremove', kind: 'shortcut', name: 'Add/Remove Programs', icon: 'addremove', parentId: 'folder.cpanel', meta: { appId: 'addremove' } },
    { id: 'cpl2.datetime', kind: 'shortcut', name: 'Date/Time', icon: 'clock', parentId: 'folder.cpanel', meta: { appId: 'datetime' } },
    { id: 'cpl2.display', kind: 'shortcut', name: 'Display', icon: 'display', parentId: 'folder.cpanel', meta: { appId: 'display' } },
    { id: 'cpl2.mouse', kind: 'shortcut', name: 'Mouse', icon: 'mouse', parentId: 'folder.cpanel', meta: { appId: 'mouse' } },
    { id: 'cpl2.sounds', kind: 'shortcut', name: 'Sounds', icon: 'sounds', parentId: 'folder.cpanel', meta: { appId: 'sounds' } },
    { id: 'cpl2.system', kind: 'shortcut', name: 'System', icon: 'computer', parentId: 'folder.cpanel', meta: { appId: 'sysprops' } },
    {
      // No printer was ever installed — itself period-true for this house.
      id: 'folder.printers',
      kind: 'folder',
      name: 'Printers',
      icon: 'printer',
      parentId: 'folder.computer',
    },
    {
      id: 'folder.my-documents',
      kind: 'folder',
      name: 'My Documents',
      icon: 'folder-docs',
      parentId: 'folder.c',
      meta: { path: 'C:\\My Documents', modifiedAt: '1997-10-10', desktop: { x: 24, y: 120 } },
    },
    {
      id: 'folder.pictures',
      kind: 'folder',
      name: 'Pictures',
      icon: 'folder-pics',
      parentId: 'folder.c',
      meta: { path: 'C:\\Pictures', modifiedAt: '1997-09-28', desktop: { x: 24, y: 216 } },
    },
    {
      id: 'folder.downloads',
      kind: 'folder',
      name: 'Downloads',
      icon: 'folder',
      parentId: 'folder.c',
      meta: { path: 'C:\\Downloads', modifiedAt: '1997-10-06' },
    },
    {
      id: 'folder.programs',
      kind: 'folder',
      name: 'Program Files',
      icon: 'folder',
      parentId: 'folder.c',
      meta: { path: 'C:\\Program Files', modifiedAt: '1997-08-14' },
    },
    // --- Installed programs (launchable from C:\Program Files) ---
    { id: 'pf.netvoyager', kind: 'shortcut', name: 'NetVoyager 3.0', icon: 'browser', parentId: 'folder.programs', meta: { appId: 'browser', modifiedAt: '1997-06-02' } },
    { id: 'pf.chat', kind: 'shortcut', name: 'Chat', icon: 'im-app', parentId: 'folder.programs', meta: { appId: 'buddyline', modifiedAt: '1997-05-11' } },
    { id: 'pf.mail', kind: 'shortcut', name: 'Mail', icon: 'mail-app', parentId: 'folder.programs', meta: { appId: 'mail', modifiedAt: '1997-03-28' } },
    { id: 'pf.notepad', kind: 'shortcut', name: 'Notepad', icon: 'notepad', parentId: 'folder.programs', meta: { appId: 'notepad', modifiedAt: '1996-11-20' } },
    { id: 'pf.pictures', kind: 'shortcut', name: 'Picture Viewer', icon: 'photo', parentId: 'folder.programs', meta: { appId: 'photos', modifiedAt: '1996-11-20' } },
    { id: 'pf.calculator', kind: 'shortcut', name: 'Calculator', icon: 'calc', parentId: 'folder.programs', meta: { appId: 'calculator', modifiedAt: '1996-11-20' } },
    { id: 'pf.calendar', kind: 'shortcut', name: 'Calendar', icon: 'calendar', parentId: 'folder.programs', meta: { appId: 'calendar', modifiedAt: '1996-11-20' } },
    { id: 'pf.solitaire', kind: 'shortcut', name: 'Solitaire', icon: 'game', parentId: 'folder.programs', meta: { appId: 'solitaire', modifiedAt: '1996-11-20' } },
    { id: 'pf.minefield', kind: 'shortcut', name: 'Minefield', icon: 'mine', parentId: 'folder.programs', meta: { appId: 'minefield', modifiedAt: '1996-11-20' } },
    { id: 'pf.paint', kind: 'shortcut', name: 'Paint', icon: 'paint', parentId: 'folder.programs', meta: { appId: 'paintbox', modifiedAt: '1996-11-20' } },
    { id: 'pf.cdplayer', kind: 'shortcut', name: 'CD Player', icon: 'cd', parentId: 'folder.programs', meta: { appId: 'discdeck', modifiedAt: '1996-11-20' } },
    { id: 'pf.clock', kind: 'shortcut', name: 'Clock', icon: 'clock', parentId: 'folder.programs', meta: { appId: 'clock', modifiedAt: '1996-11-20' } },
    { id: 'pf.display', kind: 'shortcut', name: 'Display', icon: 'display', parentId: 'folder.programs', meta: { appId: 'display', modifiedAt: '1996-11-20' } },
    { id: 'pf.sysmon', kind: 'shortcut', name: 'System Monitor', icon: 'sysmon', parentId: 'folder.programs', meta: { appId: 'sysmon', modifiedAt: '1996-11-20' } },
    { id: 'pf.dialup', kind: 'shortcut', name: 'Dial-Up Networking', icon: 'dialup', parentId: 'folder.programs', meta: { appId: 'dialup', modifiedAt: '1997-06-30' } },
    {
      id: 'folder.school',
      kind: 'folder',
      name: 'School',
      icon: 'folder',
      parentId: 'folder.my-documents',
      meta: { path: 'C:\\My Documents\\School', modifiedAt: '1997-10-08' },
    },
    {
      id: 'folder.personal',
      kind: 'folder',
      name: 'personal stuff',
      icon: 'folder',
      parentId: 'folder.my-documents',
      meta: { path: 'C:\\My Documents\\personal stuff', modifiedAt: '1997-10-09' },
    },
    {
      id: 'folder.writing',
      kind: 'folder',
      name: 'Writing!!',
      icon: 'folder',
      parentId: 'folder.my-documents',
      meta: { path: 'C:\\My Documents\\Writing!!', modifiedAt: '1997-09-30' },
    },

    // --- School (boring on purpose — except one file that is not) ---
    {
      id: 'file.minewars-report',
      kind: 'document',
      name: 'wv history - mine wars essay.txt',
      icon: 'doc',
      parentId: 'folder.school',
      meta: { createdAt: '1997-10-02', modifiedAt: '1997-10-08', sizeKb: 6 },
      body: {
        text: `THE MINE WARS AND WHAT THEY COST
Casey Taylor, Per. 3, Mr. Estep

In 1921, ten thousand miners marched on Blair Mountain because the
companies owned the houses, the stores, the scales that weighed the
coal, and the men who did the weighing. When everything in a town runs
through one set of hands, the town stops being able to say no.

(NOTE TO SELF: estep wants "relevance to today." careful how i word
that one.)

Sources:
- library, WV history shelf (all 4 books)
- grandpa taylor's stories (counts as a primary source??)
- searchhound "blair mountain" (mostly junk)`,
      },
    },
    {
      id: 'file.algebra',
      kind: 'document',
      name: 'algebra_hw_oct6.txt',
      icon: 'doc',
      parentId: 'folder.school',
      meta: { createdAt: '1997-10-06', modifiedAt: '1997-10-06', sizeKb: 1 },
      body: {
        text: `p.114 #1-19 odd
3) x = 7
5) x = -2
7) x = 4/3 ?? check w/ sadie
9) skipped, ask in class
13) no idea. NO idea.

quiz friday (the 10th) — STUDY THURS`,
      },
    },
    {
      id: 'file.english-journal',
      kind: 'document',
      name: 'english journal wk4.txt',
      icon: 'doc',
      parentId: 'folder.school',
      meta: { createdAt: '1997-09-29', modifiedAt: '1997-09-29', sizeKb: 2 },
      body: {
        text: `English 11 — journal, week 4
Prompt: "Describe a place that matters to you."

The bend on the river out Route 9, I guess. Everybody swims at the
park side but if you take the fire road past mile marker 6 there's a
spot where the bank opens up and the water goes slow and green. Dad
taught me to skip rocks there before everything. He can still do
eleven. My record is six.

It's quiet in a way the rest of this town isn't. Nobody watches you
there.

(ms. combs wrote "lovely detail" on my last one so i'm keeping the
nature thing going. easy A.)`,
      },
    },
    {
      // ACT 3 OPENER — the ledger copy, hidden behind the world's most
      // boring filename. Casey learned camouflage from her own town.
      id: 'file.ledger-copy',
      kind: 'document',
      name: 'wv history extra notes.txt',
      icon: 'doc',
      parentId: 'folder.school',
      meta: { createdAt: '1997-10-05', modifiedAt: '1997-10-05', sizeKb: 2 },
      requires: { discovery: 'the-clean-truck' },
      onOpen: { discover: ['the-pipeline'] },
      body: {
        text: `[not history notes. if you found this you were looking.]

copied from the page in the den desk, 10/5. exact as i could.

  9/02   T.M.   3   $150   V-M   ok
  9/06   R.C.   3   $180   V-M   ok
  9/12   D.K.   4   $240   V-M   ok - W.S. sat hrs
  9/19   T.M.   3   $150   V-M   ok
  9/26   L.B.   6   $360   V-M   W.S. — "no more walk-ins"
  10/03  R.C.   3   $180   V-M   ok

V-M is the pharmacy. W.S. — there is one W.S. in this town and
everybody calls him Win.

the "patients" park out front of sparks' office with license plates
from three counties away. saturday hours. cash.

i put the real page back. this is my copy. if something happens to
the page, this is still here.

if something happens to ME — sadie, it's in the SCHOOL folder,
because nobody ever looks at homework.`,
      },
    },

    // --- personal stuff ---
    {
      id: 'file.lists',
      kind: 'document',
      name: 'lists.txt',
      icon: 'doc',
      parentId: 'folder.personal',
      meta: { createdAt: '1997-08-19', modifiedAt: '1997-10-04', sizeKb: 1 },
      body: {
        text: `MIXTAPE FOR SADIE (side A)
1. solar flare - static heart
2. velvet june - anywhere but here
3. that song from the radio tues (find out name)
4. solar flare - carousel
5. something slow for the end. undecided.

THINGS I NEED
- new batteries for the discman
- blank tapes (maxell, NOT the cheap ones)
- $$ for homecoming. ask mom. beg mom.

PEOPLE WHO OWE ME
- angel $4 (movie)
- nobody else. this town is broke.`,
      },
    },
    {
      id: 'file.songs',
      kind: 'document',
      name: 'songs i wrote (private).txt',
      icon: 'doc',
      parentId: 'folder.personal',
      meta: { createdAt: '1997-07-11', modifiedAt: '1997-09-21', sizeKb: 2 },
      body: {
        text: `** if anyone reads this i will literally die **

"ROUTE 9"
green water going slow / six skips and the seventh sank
you said count again, kiddo / i've been counting since you left

(too sad? it's about dad. everything's about somebody.)

"UNTITLED 3"
the porch light stays on all night now
moths keep faith better than people do

(chorus needs work. everything needs work.)`,
      },
    },

    // --- Writing!! ---
    {
      id: 'file.riverstory',
      kind: 'document',
      name: 'story - the ferry keeper (unfinished).txt',
      icon: 'doc',
      parentId: 'folder.writing',
      meta: { createdAt: '1997-09-14', modifiedAt: '1997-09-30', sizeKb: 4 },
      body: {
        text: `THE FERRY KEEPER (working title)
by C. Taylor

Marta had run the cable ferry for eleven years, and in eleven years
she had learned that the river does not take people. People give
themselves to it, a little at a time, in ways nobody notices until
the giving is done.

The boy arrived on a Tuesday, soaked through, holding a shoebox.
"There's a bird in here," he said. "It's not doing so hot."

[chapter 2 goes here. marta fixes the bird. the bird is NOT a
metaphor ms. combs, sometimes a bird is a bird]`,
      },
    },
    {
      // PATH B for stolen-intimacy. On Oct 8 GhostBridge proved himself by
      // quoting her PRIVATE files. She pasted the log here, disguised as
      // more poems — same camouflage instinct as the ledger copy.
      id: 'file.gb-log-oct8',
      kind: 'document',
      name: 'poem drafts 2.txt',
      icon: 'doc',
      parentId: 'folder.writing',
      meta: { createdAt: '1997-10-08', modifiedAt: '1997-10-08', sizeKb: 2 },
      requires: { discovery: 'the-meeting' },
      onOpen: { discover: ['stolen-intimacy'] },
      body: {
        text: `[not poems. pasted 10/8. if i'm ever wrong about him, this is
how you'll know. he doesn't just know ABOUT me. he knows my STUFF.]

GhostBridge: you still don't trust me
SunflwrC81: i don't KNOW you. big difference
GhostBridge: you know me better than you think. "the porch light
  stays on all night now. moths keep faith better than people do."
SunflwrC81: ...
SunflwrC81: where did you get that
GhostBridge: you wrote it. it's good. you should finish the chorus.
SunflwrC81: that file is ON MY COMPUTER. it's not on my page. it's
  not ANYWHERE
GhostBridge: casey. calm down. people who do what i do have ways of
  knowing things. it's why i can help you when nobody else can.
GhostBridge: your dad can still skip eleven, right? you got to six.
SunflwrC81: stop
GhostBridge: i'm not trying to scare you. i'm showing you i'm real.
SunflwrC81: ok. you're real. that's the part that scares me`,
      },
    },

    // --- Downloads ---
    {
      id: 'file.tourdates',
      kind: 'document',
      name: 'solarflare_tourdates.txt',
      icon: 'doc',
      parentId: 'folder.downloads',
      meta: { createdAt: '1997-10-06', modifiedAt: '1997-10-06', sizeKb: 1 },
      body: {
        text: `SOLAR FLARE — "STATIC HEART" TOUR — FALL 97
(from the fan club page. saved so i stop losing it)

OCT 24 - CHARLESTON, CIVIC HALL
OCT 26 - HUNTINGTON, THE ARMORY  <-- 1 HR AWAY. POSSIBLE??
NOV 01 - MORGANTOWN, FAIRGROUNDS
NOV 03 - ROANOKE, STATE THEATER

all ages except roanoke. tickets $12 + service charge (robbery)`,
      },
    },
    {
      id: 'file.chainletter-dl',
      kind: 'document',
      name: 'GOOD_LUCK_ANGEL.txt',
      icon: 'doc',
      parentId: 'folder.downloads',
      meta: { createdAt: '1997-09-25', modifiedAt: '1997-09-25', sizeKb: 2 },
      body: {
        text: `THIS IS THE GOOD LUCK ANGEL !!! (>o<)

Send her to 10 friends within 24 HOURS and something WONDERFUL will
happen to you by the weekend. Marcy T. of Ohio deleted this message
and her modem was struck by LIGHTNING. Do not risk it!!!

(angel sent me this because of her NAME. i am keeping it purely as
evidence against her)`,
      },
    },

    {
      // PATH B to the finale. The modem never lied: Casey's evening
      // sessions stop on the 10th — and then someone keeps dialing in.
      id: 'file.modem-log',
      kind: 'document',
      name: 'modem.log',
      icon: 'doc',
      parentId: 'folder.c',
      meta: { createdAt: '1997-06-30', modifiedAt: '1997-10-17', sizeKb: 2 },
      requires: { discovery: 'who-shaped' },
      onOpen: { discover: ['the-house'] },
      body: {
        text: `[Horizons Dial-Up Networking — connection log]
[entries are written automatically. do not edit this file.]

  10/05/97  08:12 PM   connect   WestWind Online   00:28:44
  10/07/97  09:44 PM   connect   WestWind Online   01:51:07
  10/08/97  10:02 PM   connect   WestWind Online   01:22:36
  10/09/97  09:31 PM   connect   WestWind Online   02:12:03
  10/10/97  09:12 PM   connect   WestWind Online   00:24:41

  10/11/97  02:17 AM   connect   WestWind Online   00:09:12

  10/12/97  11:58 PM   connect   WestWind Online   00:05:22
  10/14/97  11:47 PM   connect   WestWind Online   00:04:51
  10/16/97  11:52 PM   connect   WestWind Online   00:06:40
  10/17/97  11:49 PM   connect   WestWind Online   00:05:19

[end of log]`,
      },
    },

    {
      // The lost cluster ScanDisk recovers on boot (the 2:31 AM power cut
      // corrupted the FAT). Mundane flavor, not a clue: startup-file junk
      // wrapped around a shred of the ferry-keeper story — the machine
      // remembers even what nobody meant to keep.
      id: 'file.chk',
      kind: 'document',
      name: 'FILE0001.CHK',
      icon: 'doc',
      parentId: 'folder.c',
      meta: { createdAt: '1997-10-18', modifiedAt: '1997-10-18', sizeKb: 16 },
      body: {
        text: `±±°°ÌÍÌÍ0ÿØÿî±²Û²±ÍÌÍÌ°°±±
LH /L:D /M:12 C:\\MTDOS\\MTCDEX.EXE
SET BLASTER=A220 I5 D1 T4
PATH=C:\\HORIZONS;C:\\MTDOS
°°°±±±²²²ÛÛÛ²²²±±±°°°ÛÛ²±°±²Û

he boy arrived on a Tuesday, soaked through, holding a shoebox.
"There's a bird in here," he said. "It's not doing so hot."

±²Û[ cluster 4,411 — unreadable ]Û²±
ÌÍÌÍÌÍÌÍÌÍÌÍÌÍÌÍÌÍÌÍÌÍÌÍ`,
      },
    },

    // --- Desktop stray note (read it again after the end.) ---
    {
      id: 'file.readme-first',
      kind: 'document',
      name: 'readme 1st.txt',
      icon: 'doc',
      parentId: 'folder.c',
      meta: {
        createdAt: '1997-06-30',
        modifiedAt: '1997-06-30',
        sizeKb: 1,
        desktop: { x: 312, y: 24 },
      },
      body: {
        text: `casey —
got your computer hooked back up after the move. new house, same
rules: don't install junk off the web, and if the modem does the
screechy thing, unplug it, count to ten, act natural.
— J

ps. change your password. i guessed it in one try. ONE.`,
      },
    },

    // =====================================================================
    // PICTURES (placeholder art, all mundane worldbuilding)
    // =====================================================================
    {
      id: 'photo.fair',
      kind: 'photo',
      name: 'fair_ferris_aug97.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-08-23',
        sizeKb: 84,
        caption: 'county fair w/ sadie + angel. angel lost her churro on this ride.',
        photoSrc: '/photos/fair_ferris_aug97.jpg',
      },
    },
    {
      id: 'photo.lockers',
      kind: 'photo',
      name: 'me_and_sadie_lockers.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-09-05',
        sizeKb: 71,
        caption: 'first week of junior year. sadie decorated my locker. it is SO much.',
        photoSrc: '/photos/me_and_sadie_lockers.jpg',
      },
    },
    {
      id: 'photo.buster',
      kind: 'photo',
      name: 'buster_box.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        // Matches the film date stamp burned into the print.
        createdAt: '1997-04-19',
        sizeKb: 66,
        caption: 'buster claims another box. the box was for him actually.',
        photoSrc: '/photos/buster_box.jpg',
      },
    },
    {
      id: 'photo.river',
      kind: 'photo',
      name: 'river_last_swim.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-08-31',
        sizeKb: 90,
        caption: "the bend out route 9, last swim of summer. dad's spot. six skips, still my record.",
        photoSrc: '/photos/river_last_swim.jpg',
      },
    },
    {
      id: 'photo.garage',
      kind: 'photo',
      name: 'garage_band.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-06-14',
        sizeKb: 77,
        caption: "sadie's cousin's band practicing. they are not good. do not tell them.",
        photoSrc: '/photos/garage_band.jpg',
      },
    },
    {
      id: 'photo.sweet16',
      kind: 'photo',
      name: 'sweet16_cake.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-04-12',
        sizeKb: 82,
        caption: 'mom made the cake herself. it leaned. we loved it. (before the wedding, before everything.)',
        photoSrc: '/photos/sweet16_cake.jpg',
      },
    },
    {
      id: 'photo.at-computer',
      kind: 'photo',
      name: 'me_deep_in_cyberspace.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-09-20',
        sizeKb: 88,
        caption: "sadie burst in and took this 'for posterity.' me and the beast, deep in cyberspace.",
        photoSrc: '/photos/casey_at_computer.jpg',
      },
    },
    {
      id: 'photo.sunflowers',
      kind: 'photo',
      name: 'moms_sunflowers.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-08-10',
        sizeKb: 74,
        caption: "mom's sunflowers got taller than the fence this year. she's unbearable about it.",
        photoSrc: '/photos/moms_sunflowers.jpg',
      },
    },

    // =====================================================================
    // EMAIL — WestWind Mail, casey_t@westwind.net
    // =====================================================================
    { id: 'mailbox.inbox', kind: 'mailbox', name: 'Inbox', icon: 'mailbox' },
    { id: 'mailbox.sent', kind: 'mailbox', name: 'Sent', icon: 'mailbox' },
    { id: 'mailbox.deleted', kind: 'mailbox', name: 'Deleted', icon: 'mailbox-trash' },

    // --- Inbox: before the 10th (mundane life) ---
    {
      id: 'email.mom.dinner',
      kind: 'email',
      name: 'dinner + this weekend',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Leslie Wright <lwright@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-09T17:41:00',
      },
      body: {
        text: `Casey - Jon and I are at the Hendersons' until late, there's leftover
casserole in the fridge, the GOOD tupperware not the mystery one in
the back. Feed Buster. Homework before computer, I mean it, the phone
bill was $$$ last month.

Also your father called the house again. I know, I know. Just - if
you want to see him this weekend that's fine, tell me first, ok?

Love you. Mom`,
      },
    },
    {
      id: 'email.school.newsletter',
      kind: 'email',
      name: 'WILDCAT WEEKLY - Week of Oct 6',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Franklin Walker Community High <office@fwch.k12.wv.net>',
        to: 'students@fwch.k12.wv.net',
        date: '1997-10-08T09:00:00',
      },
      body: {
        text: `THE WILDCAT WEEKLY — Franklin Walker Community High — Oct 6, 1997

* FALL SPORTS: Varsity football falls to Man 21-14. JV volleyball
  hosts Logan Thursday.
* PICTURE RETAKES are October 21. Forms in the front office.
* The HOMECOMING DANCE is October 25 in the main gym. Theme:
  "A Night Under the Stars." Tickets $5 at lunch.
* REMINDER: The fire road off Route 9 past mile marker 6 is COUNTY
  PROPERTY and closed after dusk. Violators will be cited.
* Chess club needs members. Seriously. Anyone. Please.`,
      },
    },
    {
      id: 'email.angel.chain',
      kind: 'email',
      name: 'FW: FW: FW: THE GOOD LUCK ANGEL!!!',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'angel jackson <angeljx@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-07T20:14:00',
      },
      body: {
        text: `>>> SEND TO 10 FRIENDS IN 24 HOURS OR ELSE <<<

ok 1) it has my NAME on it so it's basically legally binding and
2) marcy t. of ohio's modem got struck by LIGHTNING casey. i'm not
taking chances and neither should you.

(also fair pics came back from the developer. you look cute, i look
like i'm being arrested. PROOF ATTACHED. scanning them at my cousin's
took an HOUR so appreciate it.)

xoxo angel`,
      },
    },
    {
      // Attachment on Angel's chain letter — images reach the machine the
      // way they actually did in 1997: scanned at a cousin's, mailed over
      // the wire. (Same roll of film as the print in C:\Pictures — the
      // machine keeps meeting the same day from different directions.)
      id: 'attach.fair-scan',
      kind: 'photo',
      name: 'fair_us_three.jpg',
      icon: 'photo',
      parentId: 'email.angel.chain',
      meta: {
        createdAt: '1997-10-07',
        sizeKb: 92,
        caption: 'us three at the fair!! i am NOT being arrested i am WINNING a churro. — a',
        photoSrc: '/photos/fair_ferris_aug97.jpg',
      },
    },
    {
      id: 'email.fanclub.digest',
      kind: 'email',
      name: 'SOLAR FLARE FAN CIRCLE - Digest #44',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Solar Flare Fan Circle <circle@solarflareband.net>',
        to: 'circle@solarflareband.net',
        date: '1997-10-06T06:30:00',
      },
      body: {
        text: `SOLAR FLARE FAN CIRCLE — DIGEST #44

1) TOUR DATES CONFIRMED (see the website for the full list!)
2) StaticHeartGrrl asks: is the hidden track on side B real or a
   pressing error? (17 replies. it's getting heated.)
3) Trade board: HUNTINGTON 96 bootleg tape, looking for the acoustic
   radio session. No rippers this time please.

To unsubscribe, reply UNSUBSCRIBE. (This has never once worked.)`,
      },
    },
    {
      id: 'email.westwind.notice',
      kind: 'email',
      name: 'WestWind Mail: Your mailbox is 80% full',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'WestWind Online <postmaster@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-03T04:00:00',
      },
      body: {
        text: `Dear WestWind Member,

Your mailbox (casey_t) is at 80% of its 2 MB storage limit. To avoid
missed messages, please delete old mail or upgrade to WestWind GOLD
for just $4.95/month and enjoy a spacious 10 MB.

WestWind Online — "Your Window to the World Wide Web"
Member Services | Dial-up Support: 1-800-555-0134`,
      },
    },

    // --- Inbox: the 10th and after ---
    {
      // Sent at 6:02 PM on the 10th. She never read it. Read it twice.
      id: 'email.chad.sorry',
      kind: 'email',
      name: 'im sorry ok',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'chad daniels <bigchad4x4@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-10T18:02:00',
      },
      body: {
        text: `ok so that went bad. i shouldnt of grabbed your arm like that in
front of everybody. im sorry. i mean it.

but casey you gotta see it from where im standing. every nite this
week your line is busy till 2am. angel says your "on the computer."
talking to WHO. you wont say. you go all quiet when i ask. what am i
suposed to think.

whatever it is just tell me. even if its bad. im at genes with the
guys tonite, dont wanna sit home mad. call the bar if you want, ask
for me.

- c`,
      },
    },
    {
      // ACT 1 IGNITION. Reading this grants the-meeting.
      id: 'email.sadie.please',
      kind: 'email',
      name: 'please write back',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      onOpen: { discover: ['the-meeting'] },
      meta: {
        from: 'Sadie Thompson <sadiedraws77@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-11T16:22:00',
      },
      body: {
        text: `casey.

i don't even know why i'm writing this. maybe you'll dial in from
somewhere and see it. maybe your mom will. i don't know.

the police talked to me AGAIN today. i told them what i told them
before. thursday night on the porch you said you were meeting
someone friday. down by the river. "it's a whole thing, i'll tell
you saturday." you were EXCITED, casey. and scared. both at once. i
should have made you tell me. i keep thinking if i'd just made you
tell me.

you don't do things like this. you don't just GO somewhere at night
and not tell me who. you tell me everything. you have told me
everything since second grade.

so either you didn't know who it was either. or you thought you did.

please just write back. i'm not even mad. i just want you to write
back.

- s`,
      },
    },
    {
      id: 'email.church.prayer',
      kind: 'email',
      name: 'Prayer chain for the Taylor family',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Grace Fellowship Hall <fellowship@gracewv.net>',
        to: 'congregation@gracewv.net',
        date: '1997-10-13T08:15:00',
      },
      body: {
        text: `Dear friends,

Please hold Leslie, Jonathan, and Frank, and all who love Casey, in
your prayers this week. The sheriff's office asks volunteers for the
search to meet at the Route 9 trailhead at 7 AM Saturday, dress warm.

Father Mike at St. Mark's will hold a joint vigil Friday evening —
all denominations welcome, which he asked us to underline twice.

Casseroles can be left with Dorothy. She has a system.

In faith,
Grace Fellowship Hall`,
      },
    },
    {
      id: 'email.angel.sorry',
      kind: 'email',
      name: '(no subject)',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'angel jackson <angeljx@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-14T23:40:00',
      },
      body: {
        text: `i told them the truth today. the real one. i know it looks bad that
i changed it. i KNOW.

i said i dropped you home at 8 because if i said we were out back of
gene's my cousin loses his job and probably worse, and my mom -- you
know how my mom is. it didn't seem like it MATTERED, you were HOME
after, i watched you walk in.

now everybody looks at me in the hall like i did something. sadie
won't hardly talk to me.

wherever you are i'm sorry. i'd take it back. the wine coolers were
warm anyway.

- a`,
      },
    },
    {
      // Ambient, not story: delivered by evt.angel-forward a few minutes into
      // a session. Mundane on arrival — and quietly awful after the finale,
      // because Angel wasn't wrong that somebody kept signing on as Casey.
      id: 'email.angel.chain2',
      kind: 'email',
      arrivesOnline: true,
      name: 'FW: FW: FW: FW: THE GOOD LUCK ANGEL!!!',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      requires: { flag: 'angel-sent-luck' },
      meta: {
        from: 'angel jackson <angeljx@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-18T21:55:00',
      },
      body: {
        text: `>>> SEND TO 10 FRIENDS IN 24 HOURS OR ELSE <<<

ok so i know you're not her. somebody keeps signing on as her late
at night and sadie says it's probably police stuff. so. hi.

send it anyway. ten people. i told her when she comes back i'm
sending her ten more and i'm starting now. that's how sure i am
that she's coming back.

do NOT break the chain. not this one. please.

- a`,
      },
    },
    {
      // ACT 2. Sadie does the player's thinking with them — and clears Chad.
      id: 'email.sadie.notchad',
      kind: 'email',
      arrivesOnline: true,
      name: 'it’s not chad',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      requires: { discovery: 'stolen-intimacy' },
      onOpen: { discover: ['chads-window'] },
      meta: {
        from: 'Sadie Thompson <sadiedraws77@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-15T21:03:00',
      },
      body: {
        text: `they took chad in again today. third time. half the school has him
convicted because of the parking lot thing and because he's, well,
chad.

but casey, listen. it's not him. and i can prove it with his own
stupid jealousy.

that whole last week he kept cornering ME. "who's she talking to at
2am. is it a guy from man? is it somebody from charleston?" he was
OBSESSED with who you were talking to online. begging me to tell him.

if chad was the one talking to you, what was he jealous OF?

whoever it was, it was somebody who didn't need to ask me anything.
somebody who already knew things. and that list is so short it's
basically just me. and it wasn't me.

i'm going to keep pulling on this even if nobody listens to a fat
girl with a sketchbook. watch me.

- s`,
      },
    },
    {
      // ACT 2 FINALE. Frank's sighting, routed through the one relative
      // he still talks to.
      id: 'email.ruth.yourdad',
      kind: 'email',
      arrivesOnline: true,
      name: 'about your daddy',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      requires: { discovery: 'chads-window' },
      onOpen: { discover: ['the-clean-truck'] },
      meta: {
        from: 'Ruth Taylor Combs <rcombs@westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-16T19:20:00',
      },
      body: {
        text: `Casey honey, it's your Aunt Ruth. I don't know who reads this now.
Maybe nobody. I'm writing it anyway because somebody in this county
ought to write down the truth someplace.

They keep saying your daddy's name in town like a verdict. Because
it's his road. Because he drinks. Because he's Frank.

Here is what my brother told me, and Frank Taylor has never once
lied to me in fifty years: Friday night he was on his porch. Around
ten he watched a vehicle come up the fire road and stop at the bend.
A DARK 4x4, CLEAN, quiet, newer. Sat there with the lights off.

Honey, your daddy can name every engine in this county with his eyes
shut. He said, and I quote, "It wasn't the Daniels boy. That truck of
his you can hear from the church. This one was somebody who washes
his car."

He won't tell the sheriff. He'd been drinking and he's got the old
trouble on his record and he is CERTAIN they'll twist it on him. He
told me instead. Now I've told you, whoever you are.

Somebody who washes his car. In this town that's a short list too.

Aunt Ruth`,
      },
    },
    {
      // ACT 3 texture — cryptic on first read, devastating after the-pipeline.
      id: 'email.sam.question',
      kind: 'email',
      name: 'you asked me a question',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Samuel Reed <sreed@reedsdrug.westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-17T08:05:00',
      },
      body: {
        text: `Dear Casey,

Two weeks ago you stood at my counter and asked me, very carefully,
"if a doctor writes too many prescriptions, who checks?" I gave you
the short answer. The state board. I should have given you the long
one, which is: nobody, child. Nobody checks. That is the whole
problem and you had already figured it out.

I am forwarding below the letter I sent the Board of Pharmacy in
September. They have not answered. I no longer expect them to.

I don't know what you found or where you were going with it. But I
have been fifty-eight years in this town, and I know that a girl
asked me the right question and eight days later she was gone.

If anyone reads this who loves her: look after what she was carrying.

- Sam Reed

> To the WV Board of Pharmacy: I write regarding a pattern of
> scheduled-narcotic prescriptions originating from a single local
> practice and filled at a single local pharmacy, in volumes that in
> forty years of practice I have never...
> [letter continues]`,
      },
    },
    {
      // PATH B for the-pipeline. Sam stops being careful.
      id: 'email.sam.plain',
      kind: 'email',
      arrivesOnline: true,
      name: 'what i should have said',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      requires: { discovery: 'the-clean-truck' },
      onOpen: { discover: ['the-pipeline'] },
      meta: {
        from: 'Samuel Reed <sreed@reedsdrug.westwind.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-18T07:12:00',
      },
      body: {
        text: `Dear Casey,

I wrote to you yesterday and I have not slept since. I was careful in
that letter. Fifty-eight years in this town teaches you careful like
a trade. I am done with it.

Here is what I know, plainly, and I will say it to any officer of
the law who finally asks.

Since March, one local practice has written more scheduled-narcotic
prescriptions than the rest of this county combined. Nearly all of
them are filled at one pharmacy — not mine. The patients pay cash.
The plates out front are from three counties away. Saturday hours,
from a doctor who wouldn't open on a Saturday for a heart attack ten
years running.

A pharmacist who fills a script isn't required to ask why. A doctor
who writes one isn't required to answer. That is the machine, and it
runs on nobody-checks.

You stood at my counter and asked me who checks. You already knew,
didn't you. You had found something, and you were deciding who was
safe to hand it to.

Whoever reads this: she was sixteen, and she was the only one in
this county doing my job. Look at where the money goes.

I attach the letter itself. Not the quoted scraps — the letter.
Keep a copy somewhere they can't reach.

- Sam Reed`,
      },
    },
    {
      // Attachment on Sam's plain-spoken mail: the September letter to the
      // Board, whole. Evidence-grade — worth copying into your own notes.
      // Inherits the email's gating through the ancestor chain.
      id: 'attach.board-letter',
      kind: 'document',
      name: 'boardletter_sept.txt',
      icon: 'doc',
      parentId: 'email.sam.plain',
      meta: { createdAt: '1997-09-08', modifiedAt: '1997-09-08', sizeKb: 3 },
      body: {
        text: `REED'S DRUG STORE — est. 1939
S. Reed, R.Ph., proprietor

September 8, 1997

West Virginia Board of Pharmacy
Charleston, W.Va.

To whom it may concern:

I write regarding a pattern of scheduled-narcotic prescriptions
originating from a single local practice and filled at a single
local pharmacy, in volumes that in forty years behind a counter I
have never seen approached.

Since March of this year I have observed, from my own window:

  - Saturday dispensing hours at a practice that kept none for
    a decade;
  - patients paying cash, carrying plates from three counties
    away;
  - refill intervals no honest course of treatment could survive.

A pharmacist who fills a script is not required to ask why. A
doctor who writes one is not required to answer. Between those two
courtesies a great deal of harm is presently driving in and out of
this county on Saturday mornings.

I am aware what it costs a man in a small town to put his name to
a letter like this one. I have signed it anyway, and I will sign
it again for any inspector you care to send.

Respectfully,

Samuel Reed, R.Ph.
Reed's Drug Store, Humble`,
      },
    },
    {
      // ACT 3. Rebecca names the shape.
      id: 'email.rebecca',
      kind: 'email',
      arrivesOnline: true,
      name: 'to whoever is going through her things',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      requires: { discovery: 'the-pipeline' },
      onOpen: { discover: ['who-shaped'] },
      meta: {
        from: 'R. Wright <rwright@mailhouse.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-16T23:55:00',
      },
      body: {
        text: `I don't know who reads a missing girl's mail. Her mother, maybe.
The police, if anyone made them. I am counting on it being somebody.

My name is Rebecca Wright. I was married to Jonathan Wright for six
years. I read about the girl in the Register. I saw his name in the
list of family. I have started this letter four times.

I will just say it plain.

When we were married, Jonathan read my mail. All of it. I found out
because he ANSWERED some of it. As me. My own cousin got letters in
my voice for a year — my phrases, my jokes, things only I would
know — and never suspected, because Jonathan pays attention. It is
the only thing he truly does. He pays attention, and then he becomes
the person you trust.

When I finally left he told me, calm as church, that no one would
believe me. For six years no one did.

If that girl trusted somebody she shouldn't have, ask how that
somebody knew what to say.

Ask him about my mail. 1989 to 1991. Ask him.

R.W.`,
      },
    },

    // --- Sent ---
    {
      id: 'email.sent.sadie',
      kind: 'email',
      name: 're: porch tonight?',
      icon: 'mail',
      parentId: 'mailbox.sent',
      meta: {
        from: 'casey_t@westwind.net',
        to: 'Sadie Thompson <sadiedraws77@westwind.net>',
        date: '1997-10-09T21:58:00',
      },
      body: {
        text: `> porch? i have twizzlers and a new theory about the vice principal

can't tonight - busy online. tell you about it saturday. all of it,
i promise. it's kind of a big thing and i want to be SURE first.

saturday. porch. bring the twizzlers.

- c`,
      },
    },
    {
      id: 'email.sent.mom',
      kind: 'email',
      name: 're: dinner + this weekend',
      icon: 'mail',
      parentId: 'mailbox.sent',
      meta: {
        from: 'casey_t@westwind.net',
        to: 'Leslie Wright <lwright@westwind.net>',
        date: '1997-10-09T18:03:00',
      },
      body: {
        text: `yes i fed buster. yes the good tupperware. and yeah - tell dad
maybe sunday? i kind of want to see him.

the phone bill is not my fault, tell your husband the modem is FOR
the phone line, that's the whole point of it.

love you, bye, i'm fine`,
      },
    },

    // --- Deleted (mundane) ---
    {
      id: 'email.deleted.coupon',
      kind: 'email',
      name: 'SAVE BIG at Compu-Barn! October Blowout',
      icon: 'mail',
      parentId: 'mailbox.deleted',
      meta: {
        from: 'Compu-Barn Superstore <deals@compubarn.net>',
        to: 'casey_t@westwind.net',
        date: '1997-10-02T12:00:00',
      },
      body: {
        text: `COMPU-BARN OCTOBER BLOWOUT! 56K modems from $89! Blank 3.5" disks
10-pack: $4.99! Ink cartridges (ask an associate)! Compu-Barn: We're
Practically Giving It Away (Legal: we are not giving it away.)`,
      },
    },

    // =====================================================================
    // INSTANT MESSENGER — BuddyLine network, screen name SunflwrC81
    // =====================================================================
    {
      id: 'im.sadie',
      kind: 'im_conversation',
      name: 'sadiedraws77',
      icon: 'im',
      meta: { screenname: 'sadiedraws77', alias: 'sadie', logDate: '1997-10-03' },
      body: {
        messages: [
          { from: 'sadiedraws77', at: '9:02 PM', text: 'ur mom said yes to the sleepover right' },
          { from: 'SunflwrC81', at: '9:02 PM', text: 'yes. jon said "as long as your homework is done" like he\'s my dad' },
          { from: 'sadiedraws77', at: '9:03 PM', text: 'ugh. ok bring the fair pics' },
          { from: 'SunflwrC81', at: '9:03 PM', text: 'and MY radio. yours eats tapes' },
          { from: 'sadiedraws77', at: '9:04 PM', text: 'it ate ONE tape ONE time' },
          { from: 'sadiedraws77', at: '9:07 PM', text: 'hey serious second. u seemed weird at lunch. weird-weird not tired-weird' },
          { from: 'SunflwrC81', at: '9:08 PM', text: 'i\'m ok. theres just. stuff at the house. i\'ll tell u when i\'m sure' },
          { from: 'sadiedraws77', at: '9:08 PM', text: 'ok new rule. if it ever gets Actually Bad u say junebug and i come get u. no questions. day or night' },
          { from: 'SunflwrC81', at: '9:09 PM', text: 'junebug?? why junebug' },
          { from: 'sadiedraws77', at: '9:09 PM', text: 'first thing i ever drew that looked like the thing. second grade. u kept it' },
          { from: 'SunflwrC81', at: '9:10 PM', text: 'i still have it somewhere. ok. junebug. deal.' },
          { from: 'sadiedraws77', at: '9:10 PM', text: 'deal. and nobody else EVER gets that word. it\'s ours' },
          { from: 'SunflwrC81', at: '9:11 PM', text: 'ours. gnight weirdo' },
          { from: 'sadiedraws77', at: '9:11 PM', text: 'gnight. saturday!!' },
        ],
      },
    },
    {
      id: 'im.angel',
      kind: 'im_conversation',
      name: 'AngelJx',
      icon: 'im',
      meta: { screenname: 'AngelJx', alias: 'angel', logDate: '1997-10-09' },
      body: {
        messages: [
          { from: 'AngelJx', at: '7:02 PM', text: 'tomorrow after school. my cousin\'s working the back lot at gene\'s 👀' },
          { from: 'SunflwrC81', at: '7:04 PM', text: 'angel. it\'s a school night for ur cousin\'s JOB' },
          { from: 'AngelJx', at: '7:04 PM', text: 'it\'s friday tomorrow. live a little. u need it, u\'ve been a GHOST all week' },
          { from: 'SunflwrC81', at: '7:06 PM', text: 'ok fine. but i have to be home by 7. i have a thing later' },
          { from: 'AngelJx', at: '7:06 PM', text: 'what thing' },
          { from: 'SunflwrC81', at: '7:07 PM', text: 'a thing thing. tell u after' },
          { from: 'AngelJx', at: '7:07 PM', text: 'ur so mysterious lately. fine. 3:30, don\'t wear the church shoes' },
          { from: 'SunflwrC81', at: '7:08 PM', text: 'ONE time. gtg someone msgd me' },
          { from: 'AngelJx', at: '7:08 PM', text: 'ooooooo. TELL ME AFTER' },
        ],
      },
    },

    // =====================================================================
    // TRASH — the machine remembers what people throw away.
    // =====================================================================
    // The Recycle Bin's icon switches empty/full while anything is in it.
    { id: 'folder.recycle', kind: 'folder', name: 'Recycle Bin', icon: 'trash', fullWhenHasChildren: 'folder.recycle' },
    {
      id: 'trash.essay-draft',
      kind: 'trash_item',
      name: 'minewars_draft1.txt',
      icon: 'doc',
      parentId: 'folder.recycle',
      meta: {
        deletedAt: '1997-10-08',
        originalPath: 'C:\\My Documents\\School',
        sizeKb: 2,
      },
      body: {
        text: `The Mine Wars
by Casey Taylor

The Mine Wars were a series of wars that happened in the mines

[the rest of the page is blank. a strong start.]`,
      },
    },
    {
      id: 'trash.old-wallpaper',
      kind: 'trash_item',
      name: 'old_wallpaper.gif',
      icon: 'photo',
      parentId: 'folder.recycle',
      meta: {
        deletedAt: '1997-09-12',
        originalPath: 'C:\\Pictures',
        sizeKb: 120,
        caption: '(a tiled pattern of cartoon suns. it was a phase.)',
        photoSrc: '/photos/old_wallpaper.jpg',
      },
    },
    {
      // ACT 1 FINALE. She was told to delete it. She deleted it HERE.
      id: 'trash.bl-log',
      kind: 'trash_item',
      name: 'bl_log_ghstbrdg.txt',
      icon: 'doc',
      parentId: 'folder.recycle',
      requires: { discovery: 'the-meeting' },
      onOpen: { discover: ['stolen-intimacy'] },
      meta: {
        // She deleted it herself, minutes after the 9:31 PM session — like
        // he told her to. Half-obeyed: it went to the bin, not away.
        deletedAt: '1997-10-10T21:44:00',
        originalPath: 'C:\\Program Files\\Chat\\logs',
        sizeKb: 2,
      },
      body: {
        text: `[BuddyLine saved log — GhostBridge — 10/10/97]

GhostBridge: is the page somewhere safe
SunflwrC81: yes. ok my turn. you say you've been building a case on
  him for two years. you know things. FINE. but i still don't know
  you're not just some guy
GhostBridge: what would make you sure
SunflwrC81: i don't know. something real
GhostBridge: alright. tonight, when we meet — if you feel unsafe at
  any point, say junebug, and i'll know it's really you and get you
  out of there.
SunflwrC81: ...
SunflwrC81: how do you know that word
GhostBridge: i know a lot of things, casey. that's the job. it's how
  i knew about sparks before you did.
SunflwrC81: nobody knows that word. two people on EARTH know that
  word
GhostBridge: and now a third, who is on your side. the bend. ten
  o'clock. bring the page. come alone — not the boyfriend, not
  sadie. and delete these logs, all of them. if he finds out you
  talked, everything gets worse.
SunflwrC81: this is crazy. ok. ok. ten.
GhostBridge: good girl. it will all be over after tonight.
SunflwrC81: that's a weird way to say it
GhostBridge: goodnight casey
SunflwrC81: hello?
SunflwrC81: hello??`,
      },
    },
    {
      // FINALE. Deleted at 2:14 AM, October 11. She was already gone.
      id: 'trash.diary',
      kind: 'trash_item',
      name: 'diary.doc',
      icon: 'doc',
      parentId: 'folder.recycle',
      requires: { discovery: 'who-shaped' },
      onOpen: { discover: ['the-house'] },
      meta: {
        // The exact stamps ARE the finale — Properties shows them plainly.
        createdAt: '1996-06-02',
        deletedAt: '1997-10-11T02:14:00',
        modifiedAt: '1997-10-11T02:14:00',
        originalPath: 'C:\\My Documents\\personal stuff',
        sizeKb: 1,
      },
      body: {
        text: `[file partially recovered — most sectors overwritten]

...g 9 — found an envelope of cash in J's good coat looking for the
truck keys. like, a LOT of cash. probably nothing. probably...

...bottle in the glovebox with some stranger's name on...

...ct 5 — got the page from the desk in the den. copied it. put it
back EXACT. my hands were shak...

...8 — he knew junebug. HOW. i keep coming back to it. only me and
s. on the whole ea...

...doesn't matter. if GB can put sparks away then whoever he is,
he's the only adult actually DOING someth...

...ay night. after tomorrow i tell sadie everything and it's over
and things go back to nor

[end of recovered data]

[properties — diary.doc]
  created:   06/02/96
  modified:  10/11/97  2:14 AM
  deleted:   10/11/97  2:14 AM
  last user: this machine`,
      },
    },

    // =====================================================================
    // SHORTCUTS (desktop launchers)
    // =====================================================================
    {
      id: 'shortcut.mail',
      kind: 'shortcut',
      name: 'Mail',
      icon: 'mail-app',
      meta: { appId: 'mail', desktop: { x: 120, y: 120 } },
    },
    {
      id: 'shortcut.buddyline',
      kind: 'shortcut',
      name: 'Chat',
      icon: 'im-app',
      meta: { appId: 'buddyline', desktop: { x: 120, y: 216 } },
    },
    {
      id: 'shortcut.browser',
      kind: 'shortcut',
      name: 'NetVoyager',
      icon: 'browser',
      meta: { appId: 'browser', desktop: { x: 120, y: 24 } },
    },
    {
      id: 'shortcut.notepad',
      kind: 'shortcut',
      name: 'Notepad',
      icon: 'notepad',
      meta: { appId: 'notepad', desktop: { x: 216, y: 24 } },
    },
    {
      id: 'shortcut.solitaire',
      kind: 'shortcut',
      name: 'Solitaire',
      icon: 'game',
      meta: { appId: 'solitaire', desktop: { x: 216, y: 120 } },
    },
    {
      id: 'shortcut.dialup',
      kind: 'shortcut',
      name: 'WestWind Online',
      icon: 'dialup',
      meta: { appId: 'dialup', desktop: { x: 216, y: 216 } },
    },
    {
      // The one anachronism-on-purpose: the sheriff's office installed its
      // evidence viewer before handing over the keyboard. Chrome-level app;
      // every word it shows is engine-served handler content.
      id: 'shortcut.casefile',
      kind: 'shortcut',
      name: 'Case File',
      icon: 'notes',
      meta: { appId: 'casefile', desktop: { x: 24, y: 312 } },
    },
    {
      id: 'shortcut.recycle',
      kind: 'shortcut',
      name: 'Recycle Bin',
      icon: 'trash',
      fullWhenHasChildren: 'folder.recycle',
      meta: { appId: 'recycle', desktop: { x: 24, y: 408 } },
    },

    // =====================================================================
    // BOOKMARKS
    // =====================================================================
    { id: 'folder.bookmarks', kind: 'folder', name: 'Bookmarks', icon: 'folder' },
    { id: 'bm.searchhound', kind: 'bookmark', name: 'SearchHound', parentId: 'folder.bookmarks', meta: { url: 'www.searchhound.net' } },
    { id: 'bm.mypage', kind: 'bookmark', name: 'my page!!', parentId: 'folder.bookmarks', meta: { url: 'www.citypages.net/~sunflwrc81' } },
    { id: 'bm.sadiepage', kind: 'bookmark', name: "sadie's page", parentId: 'folder.bookmarks', meta: { url: 'www.citypages.net/~sadiedraws77' } },
    { id: 'bm.solarflare', kind: 'bookmark', name: 'SOLAR FLARE official', parentId: 'folder.bookmarks', meta: { url: 'www.solarflareband.net' } },
    { id: 'bm.register', kind: 'bookmark', name: 'Humble Register', parentId: 'folder.bookmarks', meta: { url: 'www.humbleregister.net' } },
    { id: 'bm.citypages', kind: 'bookmark', name: 'CityPages directory', parentId: 'folder.bookmarks', meta: { url: 'www.citypages.net' } },

    // =====================================================================
    // THE WEB (fictional, rendered by NetVoyager)
    // =====================================================================
    {
      id: 'web.searchhound',
      kind: 'webpage',
      name: 'SearchHound',
      meta: { url: 'www.searchhound.net', siteTitle: 'SearchHound — Fetch the Web!' },
      searchText: 'search engine directory web',
      body: {
        style: { bg: '#ffffff', fg: '#000000', link: '#0000cc', font: 'serif', centered: true },
        blocks: [
          { t: 'img', caption: 'SearchHound — Fetch the Web', src: '/web/searchhound_logo.svg' },
          { t: 'searchform' },
          {
            t: 'small',
            text: 'Tip: To find a person\'s home page, put their name in quotes: "casey taylor". To require a word, put + in front of it. Rex ignores the + but appreciates the effort.',
          },
          { t: 'hr' },
          {
            t: 'p',
            text: 'SearchHound indexes 4,081,226 pages found on 21,407 servers, refreshed nightly by our tireless crawler, Rex. Rex is very proud of this and would like you to know.',
          },
          {
            t: 'small',
            text: 'Or browse by topic: Arts & Entertainment · Computers & Internet · News & Media · Recreation · Regional: Appalachia · Society & Culture',
          },
          { t: 'hr' },
          {
            t: 'small',
            text: 'Surprise · Add URL · Help · Feedback — SearchHound is a service of Meridian Digital Systems. Best viewed at 800x600 in NetVoyager 3.0 or later.',
          },
          { t: 'counter', value: 4088211 },
        ],
      },
    },
    {
      id: 'web.casey-page',
      kind: 'webpage',
      name: "casey's corner of the web",
      meta: { url: 'www.citypages.net/~sunflwrc81', siteTitle: "~*~ casey's corner ~*~" },
      searchText: 'casey taylor humble personal homepage sunflower',
      body: {
        style: { bg: '#000033', fg: '#ffffcc', link: '#66ffff', font: 'sans', centered: true, accent: '#ff66cc' },
        blocks: [
          { t: 'h', text: "~*~ welcome to casey's corner ~*~" },
          { t: 'marquee', text: 'you are visitor number one zillion. under construction FOREVER.' },
          { t: 'img', caption: '[ spinning sunflower gif ]' },
          { t: 'p', text: "hi i'm casey. 16. humble west virginia (if you know where that is i'm so sorry). i like: solar flare, my cat buster, the river, writing stories i never finish, my friends." },
          { t: 'p', text: 'i dislike: algebra, chain letters (ANGEL), when the modem drops you at 11:58 pm, people who ask what my dad is up to.' },
          { t: 'hr' },
          { t: 'sub', text: 'cool links' },
          { t: 'link', text: 'SOLAR FLARE official site', url: 'www.solarflareband.net' },
          { t: 'link', text: "sadie's page (actual art on it, not like mine)", url: 'www.citypages.net/~sadiedraws77' },
          { t: 'link', text: 'the CityPages member directory (find ur neighbors)', url: 'www.citypages.net' },
          { t: 'link', text: 'SearchHound', url: 'www.searchhound.net' },
          { t: 'hr' },
          { t: 'small', text: 'sign my guestbook!! (guestbook broken since june. it counts the thought.)' },
          { t: 'counter', value: 1204 },
        ],
      },
    },
    {
      id: 'web.sadie-page',
      kind: 'webpage',
      name: 'sadie draws (sometimes)',
      meta: { url: 'www.citypages.net/~sadiedraws77', siteTitle: 'sadie draws (sometimes)' },
      searchText: 'sadie thompson art sketches drawing humble',
      body: {
        style: { bg: '#f4f0e4', fg: '#333322', link: '#886600', font: 'sans', centered: true },
        blocks: [
          { t: 'h', text: 'sadie draws (sometimes)' },
          { t: 'small', text: 'a page for my sketches. casey made me put them up. blame her.' },
          { t: 'img', caption: '[ scanned sketch: a girl on a porch, done in ballpoint. it\'s good. it\'s really good. ]' },
          { t: 'img', caption: '[ scanned sketch: a junebug, second-grade style, kept for sentimental reasons ]' },
          { t: 'list', items: ['things i draw: people who don\'t know i\'m drawing them', 'things i won\'t draw: your boyfriend, stop asking', 'currently reading: everything true-crime the library has'] },
          { t: 'hr' },
          { t: 'small', text: 'last updated october 4 1997. (probably a while ago now, whenever you\'re reading this.)' },
          { t: 'counter', value: 312 },
        ],
      },
    },
    {
      id: 'web.solarflare',
      kind: 'webpage',
      name: 'SOLAR FLARE official',
      meta: { url: 'www.solarflareband.net', siteTitle: 'SOLAR FLARE — official site' },
      searchText: 'solar flare band static heart tour music',
      body: {
        style: { bg: '#110011', fg: '#ffcc00', link: '#ff6600', font: 'sans', centered: true },
        blocks: [
          { t: 'h', text: 'SOLAR FLARE' },
          { t: 'sub', text: 'new album "STATIC HEART" out now on Meridian Records' },
          { t: 'img', caption: '[ band photo: four people refusing to smile ]' },
          { t: 'p', text: 'FALL TOUR ON SALE NOW. Charleston, Huntington, Morgantown, Roanoke. All ages except Roanoke (sorry, Roanoke).' },
          { t: 'link', text: 'join the FAN CIRCLE mailing list', url: 'www.solarflareband.net' },
          { t: 'hr' },
          { t: 'small', text: 'webmaster: dennis. yes the drummer. no i will not fix the guestbook.' },
        ],
      },
    },
    {
      id: 'web.register',
      kind: 'webpage',
      name: 'The Humble Register',
      meta: { url: 'www.humbleregister.net', siteTitle: 'The Humble Register — Online Edition' },
      searchText: 'humble register news casey taylor missing search route 9 river bend',
      body: {
        style: { bg: '#ffffff', fg: '#111111', link: '#0000aa', font: 'serif' },
        blocks: [
          { t: 'h', text: 'The Humble Register' },
          { t: 'small', text: 'Online Edition — Updated Wednesdays (usually) — Oct. 15, 1997' },
          { t: 'hr' },
          { t: 'sub', text: 'SEARCH FOR MISSING TEEN ENTERS SECOND WEEK' },
          { t: 'p', text: 'The search for Casey Taylor, 16, of Humble, continued this week with volunteers walking the fire roads along the river. Taylor was last seen the evening of Friday, Oct. 10. Her bicycle was recovered near the Route 9 trailhead the following morning.' },
          { t: 'p', text: 'Sheriff Dale Purvis urged residents with information to come forward. "Somebody saw something," Purvis said. "In a county this size, somebody always has."' },
          { t: 'p', text: 'A joint vigil is planned Friday evening at St. Mark\'s. The family has asked for privacy. Value-Med Discount Pharmacy has donated flashlights and batteries for the volunteer search teams.' },
          { t: 'hr' },
          { t: 'sub', text: 'ALSO THIS WEEK' },
          { t: 'list', items: ['County board delays Route 9 guardrail project a third time', 'Wildcats fall to Man 21-14; Logan up next', 'Harvest Festival parking: what to know (bring quarters)'] },
          { t: 'link', text: 'SPECIAL REPORT: A timeline of Friday, Oct. 10 — what we can pin down', url: 'www.humbleregister.net/timeline' },
          { t: 'hr' },
          { t: 'small', text: 'The Register Online is a service of Humble Printing & Copy. Story tips: tips@humbleregister.net' },
        ],
      },
    },
    {
      // PATH B for chads-window: the barstool alibi, on the record.
      id: 'web.register-timeline',
      kind: 'webpage',
      name: 'The Humble Register: Timeline of Oct. 10',
      meta: { url: 'www.humbleregister.net/timeline', siteTitle: 'The Humble Register — A Timeline of Friday, Oct. 10' },
      searchText: 'chad daniels timeline genes bar alibi barstool last day friday october 10 casey taylor',
      requires: { discovery: 'stolen-intimacy' },
      onOpen: { discover: ['chads-window'] },
      body: {
        style: { bg: '#ffffff', fg: '#111111', link: '#0000aa', font: 'serif' },
        blocks: [
          { t: 'h', text: 'The Humble Register' },
          { t: 'small', text: 'Online Edition — SPECIAL REPORT, posted Oct. 17, 1997' },
          { t: 'hr' },
          { t: 'sub', text: 'THE LAST DAY: WHAT WE CAN PIN DOWN' },
          { t: 'p', text: 'The Register has assembled the following from public statements and our own interviews. Times are approximate except where noted.' },
          { t: 'list', items: [
            '3:30 PM — Franklin Walker lets out. Multiple students describe an argument in the parking lot between Casey Taylor and her boyfriend, Chad Daniels, 19.',
            '4 to 7 PM — Taylor is with a friend; investigators say her movements in this window are now accounted for.',
            'About 7 PM — Taylor is dropped off at home. A neighbor recalls seeing her at the mailbox.',
            '6 PM to closing — Daniels is at Gene’s Bar. "That boy was on the same stool from six until we shut the kitchen," said Earl Prater, who tends bar there. "Used the bar phone twice trying to call the Taylor girl’s house. I dialed it for him the second time." The bar’s phone records are consistent with that account, the sheriff’s office confirmed Thursday.',
            'About 9:50 PM — A resident along Route 9 reports hearing a single vehicle on the fire road. The report is unverified.',
            '7:05 AM Saturday — Taylor’s bicycle is found at the Route 9 trailhead.',
          ] },
          { t: 'p', text: 'Sheriff Dale Purvis declined to name any person of interest. "Folks want it to be simple," Purvis said. "Simple has an alibi."' },
          { t: 'hr' },
          { t: 'small', text: 'The Register Online is a service of Humble Printing & Copy. Story tips: tips@humbleregister.net' },
        ],
      },
    },
    {
      id: 'web.mapfinder-bend',
      kind: 'webpage',
      name: 'MapFinder: Route 9 river bend',
      meta: { url: 'www.mapfinder.net/maps/route9-bend', siteTitle: 'MapFinder — Route 9 River Bend' },
      searchText: 'mapfinder map route 9 river bend fire road mile marker 6 directions',
      requires: { discovery: 'the-meeting' },
      body: {
        style: { bg: '#f4f4e8', fg: '#222222', link: '#006600', font: 'sans' },
        blocks: [
          { t: 'h', text: 'MapFinder' },
          { t: 'small', text: 'Maps for the Modern Motorist — beta' },
          { t: 'hr' },
          { t: 'sub', text: 'Route 9 river bend — Humble County, WV' },
          { t: 'img', caption: '[ map tile: the river, fire road switchbacks past mile marker 6, a marked pull-off at the bend. one residence nearby: a parcel on the ridge above the road. ]' },
          { t: 'p', text: 'Access via the county fire road off Route 9, past mile marker 6. Gate closed to vehicles after dusk; foot access is not patrolled. Approx. 20 minutes by bicycle from downtown Humble.' },
          { t: 'small', text: 'MapFinder cannot verify current road conditions. Print this page before travelling.' },
        ],
      },
    },

    // The generated CityPages neighborhood + member directory (see webgen.ts).
    ...GENERATED_WEB,

    // --- Datebook data (read by the Calendar accessory; not in any folder) ---
    {
      id: 'file.datebook-1997',
      kind: 'document',
      name: 'datebook.dat',
      icon: 'doc',
      meta: { createdAt: '1997-01-04', modifiedAt: '1997-10-09', sizeKb: 2 },
      body: {
        text: `1997-06-14: mom's wedding. smile.
1997-08-23: county fair w/ s + a
1997-09-26: sparks office - sports physical (SATURDAY?? whatever)
1997-10-03: sleepover @ sadie's
1997-10-06: pharmacy after school
1997-10-09: STUDY. quiz tmrw. actually study
1997-10-10: algebra quiz
1997-10-10: ★ 10pm
1997-10-21: picture retakes (fix bangs FIRST this time)
1997-10-25: homecoming - find shoes
1997-10-26: SOLAR FLARE HUNTINGTON?? beg mom. beg harder
1997-11-27: thanksgiving @ aunt ruth's`,
      },
    },
  ],
};
