/**
 * SEASON 1 — "The Overlook" — Maple Glen, October 1997.
 *
 * SERVER-ONLY STORY DATA. This module is imported by the Supabase Edge
 * Function and (in local development only) by the dev in-browser adapter.
 * It must never be reachable from a production client bundle — the
 * `check:bundle` script enforces this.
 *
 * The machine belongs to Casey Brennan, 16. She has been missing since
 * Friday, October 10. The in-world clock is frozen at Saturday, October 18,
 * 9:47 PM — the night someone finally sits down at her computer.
 *
 * Demo clue chain:
 *   login -> desktop -> Dana's email (overlook-plan)
 *         -> GhostBridge IM log (ghostbridge-logs)
 *         -> oct_pages.txt diary (third-screen-name, ends demo)
 */

import type { SeasonContent } from './types.ts';

export const SEASON1: SeasonContent = {
  slug: 'season-1',
  title: 'Last Login — Season 1: The Overlook',
  clock: { now: '1997-10-18T21:47:00' },
  computer: {
    owner: 'Casey Brennan',
    loginUser: 'casey',
    loginTargetId: 'login.casey',
    // Rendered as a sticky note taped beside the login prompt.
    loginHint: 'C — quit using mom’s flower + the year. anyone could guess it. — J',
  },
  passwords: {
    // Placeholder v1 login puzzle. The sticky note + the sunflower photo on
    // the desk (login screen art) point here.
    'login.casey': { password: 'sunflower97' },
  },
  wallpaper: 'teal',
  homeUrl: 'www.searchhound.net',
  maxPasswordAttempts: 8,
  lockoutSeconds: 300,

  discoveries: [
    {
      id: 'overlook-plan',
      title: 'The overlook plan',
      description:
        "Dana believed Casey went to meet Mel at the overlook on Friday night. Mel swears no such plan was ever made.",
    },
    {
      id: 'ghostbridge-logs',
      title: 'GhostBridge',
      description:
        'Casey spent her last night online talking to a screen name nobody in her life recognizes — and it asked her to delete the logs.',
    },
    {
      id: 'third-screen-name',
      title: 'The third screen name',
      description:
        'Casey thought she was talking to Mel. Mel never sent those messages. Whoever was behind GhostBridge knew things only Mel should know.',
      endsDemo: true,
    },
  ],

  buddies: [
    {
      screenname: 'MelWave81',
      alias: 'mel',
      group: 'Buddies',
      status: 'away',
      awayMessage: 'not here. leave one.',
      conversationId: 'im.melwave81',
    },
    {
      screenname: 'beccs8r',
      alias: 'becca',
      group: 'Buddies',
      status: 'online',
      conversationId: 'im.beccs8r',
    },
    {
      screenname: 'DHartnell',
      alias: 'dana',
      group: 'Buddies',
      status: 'online',
    },
    {
      screenname: 'jjbrennan',
      alias: 'jesse (bro)',
      group: 'Family',
      status: 'offline',
    },
    {
      screenname: 'GhostBridge',
      group: 'Buddies',
      status: 'offline',
      conversationId: 'im.ghostbridge',
      requires: { discovery: 'overlook-plan' },
    },
  ],

  items: [
    // =====================================================================
    // FILESYSTEM
    // =====================================================================
    {
      id: 'folder.c',
      kind: 'folder',
      name: 'Casey (C:)',
      icon: 'drive',
      meta: { path: 'C:\\', desktop: { x: 24, y: 24 } },
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
      meta: { path: 'C:\\My Documents\\personal stuff', modifiedAt: '1997-10-10' },
    },
    {
      id: 'folder.writing',
      kind: 'folder',
      name: 'Writing!!',
      icon: 'folder',
      parentId: 'folder.my-documents',
      meta: { path: 'C:\\My Documents\\Writing!!', modifiedAt: '1997-09-30' },
    },

    // --- School (boring on purpose) ---
    {
      id: 'file.civilwar-report',
      kind: 'document',
      name: 'report_civilwar_FINAL2.txt',
      icon: 'doc',
      parentId: 'folder.school',
      meta: { createdAt: '1997-10-02', modifiedAt: '1997-10-08', sizeKb: 6 },
      body: {
        text: `THE HOMEFRONT ECONOMY, 1861-1865
Casey Brennan, Per. 3, Mr. Whitfield

The war changed daily life for ordinary families in ways textbooks
mostly skip. Prices of coffee and cloth rose sharply. Women ran farms
and shops. Letters took weeks to arrive, if they arrived at all.

(NOTE TO SELF: whitfield wants 3 pages. this is 1.5. pad the
conclusion. do NOT forget the bibliography this time)

Sources so far:
- library encyclopedia vol 4
- that PBS-looking documentary grandpa taped
- searchhound "civil war economy" (mostly junk)`,
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
7) x = 4/3 ?? check w/ mel
9) skipped, ask in class
11) x = 11
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
        text: `English 10 — journal, week 4
Prompt: "Describe a place that matters to you."

The reservoir in summer, I guess. Everyone goes to the swim beach side
but if you walk the fire road past the pump house there's a spot where
the pines open up and you can see the whole valley. Dad used to take us
up there before he moved. It's quieter than anywhere.

(ms. okafor said "lovely detail" on my last one so I'm keeping the
nature thing going. easy A.)`,
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
        text: `MIXTAPE FOR DANA (side A)
1. solar flare - static heart
2. the plimsouls?? ask jesse
3. that song from the radio tues (find out name)
4. velvet june - anywhere but here
5. solar flare - carousel

THINGS I NEED
- new batteries for the discman
- blank tapes (maxell, NOT the cheap ones)
- $$ for the fair. ask mom. beg mom.

PEOPLE WHO OWE ME
- becca $4 (movie)
- jesse infinite dollars (emotional damages)`,
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

"COIN ON THE TRACKS"
we put a coin on the tracks in june
flattened silver, cheap little moon
you said keep it, i kept it too
some things stay even when people move

(chorus needs work. everything needs work.)

"UNTITLED 3"
the porch light stays on all night now
moths keep faith better than people do

(too sad? too sad.)`,
      },
    },
    {
      id: 'file.oct-pages',
      kind: 'document',
      name: 'oct_pages.txt',
      icon: 'doc',
      parentId: 'folder.personal',
      meta: { createdAt: '1997-10-01', modifiedAt: '1997-10-10', sizeKb: 3 },
      requires: { discovery: 'ghostbridge-logs' },
      onOpen: { discover: ['third-screen-name'] },
      body: {
        text: `oct 1 — mom took double shifts again. house is SO quiet. jesse called
from state, talked for an hour about his roommate's ferret. a FERRET.

oct 5 — fair with dana + becca. won a goldfish, named him Agent. he is
already looking unwell. godspeed Agent.

oct 9 — ok so. someone new messaged me two nights ago. wouldn't say who
they were at first, just "you know me." i thought it was becca messing
around but they knew stuff becca doesn't know. then last night they
said it. they knew about the bracelet. THE BRACELET. only mel knows
about the bracelet. only mel on the ENTIRE EARTH.

so it has to be mel, right? new screen name, being weird, whatever.
that's a mel thing to do.

oct 10 — m wants to meet at the overlook tonight. 10pm. "come alone,
tell no one, delete the logs." which is dramatic even for mel.

but here's the thing i keep not writing down. mel types "hehe." mel
can't spell definitely. mel says goodnight like a normal person.
GhostBridge types like... i don't know. like someone doing an
impression of a person.

it knew about the bracelet. so it HAS to be mel.

unless somehow it isn't.

going anyway. if this is mel i'm going to kill her.`,
      },
    },

    // --- Writing!! ---
    {
      id: 'file.lighthouse',
      kind: 'document',
      name: 'story - the lighthouse keeper (unfinished).txt',
      icon: 'doc',
      parentId: 'folder.writing',
      meta: { createdAt: '1997-09-14', modifiedAt: '1997-09-30', sizeKb: 4 },
      body: {
        text: `THE LIGHTHOUSE KEEPER (working title)
by C. Brennan

Marta had kept the light for eleven years and in eleven years she had
learned that the sea does not take people. People give themselves to
it, a little at a time, in ways nobody notices until the giving is
done.

The boy arrived on a Tuesday, soaked through, holding a shoebox.
"There's a bird in here," he said. "It's not doing so hot."

[chapter 2 goes here. marta fixes the bird. the bird is NOT a metaphor
mrs okafor, sometimes a bird is a bird]`,
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
(from the fan club page. saved so I stop losing it)

OCT 24 - PORTVALE, CIVIC HALL
OCT 26 - RIVERTON, THE ARMORY  <-- 2 HRS AWAY. POSSIBLE??
NOV 01 - CASCADE CITY, FAIRGROUNDS
NOV 03 - MERIDIAN, STATE THEATER

all ages except meridian. tickets $12 + service charge (robbery)`,
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

(becca sent me this. i am keeping it purely as evidence against her)`,
      },
    },

    // --- Desktop stray note ---
    {
      id: 'file.readme-first',
      kind: 'document',
      name: 'readme 1st.txt',
      icon: 'doc',
      parentId: 'folder.c',
      meta: {
        createdAt: '1997-08-30',
        modifiedAt: '1997-08-30',
        sizeKb: 1,
        desktop: { x: 312, y: 24 },
      },
      body: {
        text: `casey —
fixed your sound card AGAIN. you're welcome AGAIN.
don't install junk off the web. if the modem does the screechy thing,
unplug it, count to ten, act natural.
also you left your discman in my car. it's on the fridge.
— jesse

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
        caption: 'county fair w/ dana + becca. becca lost her churro on this ride.',
        photoSrc: '/photos/fair_ferris.svg',
      },
    },
    {
      id: 'photo.lockers',
      kind: 'photo',
      name: 'me_and_dana_lockers.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-09-05',
        sizeKb: 71,
        caption: 'first week of sophomore year. dana decorated my locker. it is SO much.',
        photoSrc: '/photos/lockers.svg',
      },
    },
    {
      id: 'photo.buster',
      kind: 'photo',
      name: 'buster_box.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-07-30',
        sizeKb: 66,
        caption: 'buster claims another box. the box was for him actually.',
        photoSrc: '/photos/buster.svg',
      },
    },
    {
      id: 'photo.reservoir',
      kind: 'photo',
      name: 'reservoir_last_swim.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-08-31',
        sizeKb: 90,
        caption: 'last swim of summer. water was FREEZING. worth it.',
        photoSrc: '/photos/reservoir.svg',
      },
    },
    {
      id: 'photo.garage',
      kind: 'photo',
      name: 'jesses_band_garage.gif',
      icon: 'photo',
      parentId: 'folder.pictures',
      meta: {
        createdAt: '1997-06-14',
        sizeKb: 77,
        caption: "jesse's band practicing. they are not good. do not tell jesse.",
        photoSrc: '/photos/garage.svg',
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
        caption: 'mom made the cake herself. it leaned. we loved it.',
        photoSrc: '/photos/sweet16.svg',
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
        photoSrc: '/photos/sunflowers.svg',
      },
    },

    // =====================================================================
    // EMAIL — WestWind Mail, casey_b@westwind.net
    // =====================================================================
    { id: 'mailbox.inbox', kind: 'mailbox', name: 'Inbox', icon: 'mailbox' },
    { id: 'mailbox.sent', kind: 'mailbox', name: 'Sent', icon: 'mailbox' },
    { id: 'mailbox.deleted', kind: 'mailbox', name: 'Deleted', icon: 'mailbox-trash' },

    // --- Inbox ---
    {
      id: 'email.dana.please-write-back',
      kind: 'email',
      name: 'please write back',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Dana Hartnell <dhartnell@westwind.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-11T16:22:00',
      },
      onOpen: { discover: ['overlook-plan'] },
      body: {
        text: `casey.

i don't even know why i'm writing this. maybe you'll dial in from
somewhere and see it. maybe your mom will. i don't know.

the police talked to me AGAIN today. i told them what i told them
before. you said you were meeting mel at the overlook friday night.
that's what you told me at lunch. "meeting mel, don't wait up, it's a
whole thing."

but casey. mel says there was no plan. she wasn't even home friday,
she was at her cousin's in portvale, her mom confirmed it. she found
out you said that and she cried in the bathroom for the whole of
third period.

so either mel is lying, which — it's MEL. or you lied to me. and you
don't lie to me. you never lie to me.

who were you actually going to meet?

please just write back. i'm not even mad. i just want you to write
back.

- d`,
      },
    },
    {
      id: 'email.dana.answer-me',
      kind: 'email',
      name: '(no subject)',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Dana Hartnell <dhartnell@westwind.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-14T23:05:00',
      },
      body: {
        text: `it's late and your porch light is on. i can see it from my window.
your mom leaves it on for you.

ok.

that's all. that's the whole email.

- d`,
      },
    },
    {
      id: 'email.mom.leftovers',
      kind: 'email',
      name: 'dinner',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Linda Brennan <lbrennan@westwind.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-09T17:41:00',
      },
      body: {
        text: `Casey - working the late shift again tonight, there's leftover
casserole in the fridge, the GOOD tupperware not the mystery one in
the back. Feed Buster, do your homework, don't stay on that computer
all night, the phone bill was $$$ last month.

Love you. Mom

P.S. Aunt Patty says you never answered her email about Thanksgiving.
Answer your aunt.`,
      },
    },
    {
      id: 'email.school.newsletter',
      kind: 'email',
      name: 'MGH FALCON FLYER - Week of Oct 6',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Maple Glen High School <office@mapleglen.k12.net>',
        to: 'students@mapleglen.k12.net',
        date: '1997-10-08T09:00:00',
      },
      body: {
        text: `THE FALCON FLYER — Maple Glen High School — Week of October 6, 1997

* FALL SPORTS: Varsity soccer defeats Riverton 2-1. JV volleyball
  hosts Portvale Thursday.
* PICTURE RETAKES are October 21. Forms in the front office.
* The HOMECOMING DANCE is October 25 in the main gym. Theme:
  "A Night Under the Stars." Tickets $5 at lunch.
* REMINDER: The fire road behind the reservoir is CLOSED to students.
  This is county property. Violators will be cited.
* Chess club needs members. Seriously. Anyone. Please.`,
      },
    },
    {
      id: 'email.becca.chain',
      kind: 'email',
      name: 'FW: FW: FW: THE GOOD LUCK ANGEL!!!',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'becca t <beccs8r@westwind.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-07T20:14:00',
      },
      body: {
        text: `>>> SEND TO 10 FRIENDS IN 24 HOURS OR ELSE <<<

ok i KNOW you don't believe in these but marcy t. of ohio's modem
got struck by LIGHTNING casey. LIGHTNING. i'm not taking chances
and neither should you.

(also are we still on for the fair pics? my mom finally got the film
developed. you look cute, i look like i'm being arrested.)

xoxo becca`,
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
3) Trade board: I have a RIVERTON 96 bootleg tape, looking for the
   acoustic radio session. No rippers this time please.

To unsubscribe, reply UNSUBSCRIBE. (This has never once worked.)`,
      },
    },
    {
      id: 'email.aunt-patty',
      kind: 'email',
      name: 'Thanksgiving??',
      icon: 'mail',
      parentId: 'mailbox.inbox',
      meta: {
        from: 'Patricia Kowalski <pkowalski@westwind.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-05T11:12:00',
      },
      body: {
        text: `Hi sweetheart! It's your Aunt Patty! I am typing this on Ron's new
computer so forgive me if it comes out strange. Are you and your mom
and Jesse coming for Thanksgiving? Ron is deep-frying the turkey this
year which the fire department has opinions about. Let me know!! Love,
Aunt Patty

P.S. how do I make the letters bigger. Ron doesn't know either.`,
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
        to: 'casey_b@westwind.net',
        date: '1997-10-03T04:00:00',
      },
      body: {
        text: `Dear WestWind Member,

Your mailbox (casey_b) is at 80% of its 2 MB storage limit. To avoid
missed messages, please delete old mail or upgrade to WestWind GOLD
for just $4.95/month and enjoy a spacious 10 MB.

WestWind Online — "Your Window to the World Wide Web"
Member Services | Dial-up Support: 1-800-555-0134`,
      },
    },

    // --- Sent ---
    {
      id: 'email.sent.dana-homework',
      kind: 'email',
      name: 're: did you do the algebra',
      icon: 'mail',
      parentId: 'mailbox.sent',
      meta: {
        from: 'casey_b@westwind.net',
        to: 'Dana Hartnell <dhartnell@westwind.net>',
        date: '1997-10-09T21:58:00',
      },
      body: {
        text: `> did you do the algebra or are we both doomed

did most of it. #13 is a war crime. copy mine at lunch.

can't talk tonight - busy online. tell you about it later. maybe.
it's kind of a weird thing.

- c`,
      },
    },
    {
      id: 'email.sent.mom-cat',
      kind: 'email',
      name: 're: dinner',
      icon: 'mail',
      parentId: 'mailbox.sent',
      meta: {
        from: 'casey_b@westwind.net',
        to: 'Linda Brennan <lbrennan@westwind.net>',
        date: '1997-10-09T18:03:00',
      },
      body: {
        text: `yes i fed buster. yes the good tupperware. yes i'll answer aunt patty.
the phone bill is jesse's fault historically and spiritually.

love you, bye, i'm fine`,
      },
    },

    // --- Deleted ---
    {
      id: 'email.deleted.coupon',
      kind: 'email',
      name: 'SAVE BIG at Compu-Barn! October Blowout',
      icon: 'mail',
      parentId: 'mailbox.deleted',
      meta: {
        from: 'Compu-Barn Superstore <deals@compubarn.net>',
        to: 'casey_b@westwind.net',
        date: '1997-10-02T12:00:00',
      },
      body: {
        text: `COMPU-BARN OCTOBER BLOWOUT! 56K modems from $89! Blank 3.5" disks
10-pack: $4.99! Ink cartridges (ask an associate)! Compu-Barn: We're
Practically Giving It Away (Legal: we are not giving it away.)`,
      },
    },

    // =====================================================================
    // INSTANT MESSENGER — BuddyLine, screen name SunflwrC81
    // =====================================================================
    {
      id: 'im.melwave81',
      kind: 'im_conversation',
      name: 'MelWave81',
      icon: 'im',
      meta: { screenname: 'MelWave81', alias: 'mel', logDate: '1997-10-08' },
      body: {
        messages: [
          { from: 'MelWave81', at: '8:12 PM', text: 'did u start the civil war thing' },
          { from: 'SunflwrC81', at: '8:12 PM', text: 'define started' },
          { from: 'MelWave81', at: '8:13 PM', text: 'hehe. so no' },
          { from: 'SunflwrC81', at: '8:13 PM', text: 'i have a TITLE. titles are half the battle' },
          { from: 'MelWave81', at: '8:14 PM', text: 'the battle is definately the other half' },
          { from: 'SunflwrC81', at: '8:14 PM', text: '*definitely' },
          { from: 'MelWave81', at: '8:14 PM', text: 'i will block u' },
          { from: 'SunflwrC81', at: '8:16 PM', text: 'becca wants to do a thing at the reservoir sat. u in?' },
          { from: 'MelWave81', at: '8:17 PM', text: 'cant. cousins in portvale this wkend. moms making me' },
          { from: 'SunflwrC81', at: '8:17 PM', text: 'boooo' },
          { from: 'MelWave81', at: '8:19 PM', text: 'hey random but. u still have it right' },
          { from: 'SunflwrC81', at: '8:19 PM', text: 'have what' },
          { from: 'MelWave81', at: '8:19 PM', text: 'u KNOW what. bracelet' },
          { from: 'SunflwrC81', at: '8:20 PM', text: 'obviously. its in the box in the box in the box' },
          { from: 'MelWave81', at: '8:20 PM', text: 'good. ok. that stays us-only FOREVER. swear again' },
          { from: 'SunflwrC81', at: '8:20 PM', text: 'i swear AGAIN. u weirdo. nobody knows. nobody will ever know' },
          { from: 'MelWave81', at: '8:21 PM', text: 'ok hehe. gnight casey' },
          { from: 'SunflwrC81', at: '8:21 PM', text: 'night mel' },
        ],
      },
    },
    {
      id: 'im.beccs8r',
      kind: 'im_conversation',
      name: 'beccs8r',
      icon: 'im',
      meta: { screenname: 'beccs8r', alias: 'becca', logDate: '1997-10-09' },
      body: {
        messages: [
          { from: 'beccs8r', at: '7:02 PM', text: 'RESERVOIR SATURDAY. spread the word. my brother can drive' },
          { from: 'SunflwrC81', at: '7:04 PM', text: 'ur brother drives like the car owes him money' },
          { from: 'beccs8r', at: '7:04 PM', text: 'and yet. free ride' },
          { from: 'beccs8r', at: '7:05 PM', text: 'did u get my angel email. did u send it to 10 ppl' },
          { from: 'SunflwrC81', at: '7:05 PM', text: 'i deleted it and i feel STRONGER for it' },
          { from: 'beccs8r', at: '7:06 PM', text: 'marcy t of ohio casey. LIGHTNING' },
          { from: 'SunflwrC81', at: '7:08 PM', text: 'gtg. someone msgd me' },
          { from: 'beccs8r', at: '7:08 PM', text: 'oooooo who' },
          { from: 'SunflwrC81', at: '7:09 PM', text: 'nobody. tell u later' },
          { from: 'beccs8r', at: '7:09 PM', text: 'RUDE. fine. sat!!' },
        ],
      },
    },
    {
      id: 'im.ghostbridge',
      kind: 'im_conversation',
      name: 'GhostBridge',
      icon: 'im',
      meta: { screenname: 'GhostBridge', logDate: '1997-10-10' },
      requires: { discovery: 'overlook-plan' },
      onOpen: { discover: ['ghostbridge-logs'] },
      body: {
        messages: [
          { from: 'GhostBridge', at: '9:31 PM', text: 'are you alone' },
          { from: 'SunflwrC81', at: '9:31 PM', text: 'yes?? mom works fridays. u know that' },
          { from: 'GhostBridge', at: '9:32 PM', text: 'good. tonight then. the overlook. 10 pm.' },
          { from: 'SunflwrC81', at: '9:32 PM', text: 'ok this has gone on long enough. mel is this you' },
          { from: 'SunflwrC81', at: '9:32 PM', text: 'why the new name. whats wrong w/ ur normal one' },
          { from: 'GhostBridge', at: '9:33 PM', text: 'you already know who i am.' },
          { from: 'SunflwrC81', at: '9:33 PM', text: 'say something only mel would know then' },
          { from: 'GhostBridge', at: '9:34 PM', text: 'june. the tracks. the coin you flattened.' },
          { from: 'GhostBridge', at: '9:34 PM', text: 'the bracelet in the box in the box in the box.' },
          { from: 'SunflwrC81', at: '9:35 PM', text: 'ok. ok fine its you. u had me going honestly' },
          { from: 'SunflwrC81', at: '9:35 PM', text: 'but ur supposed to be in portvale?? did ur mom cancel' },
          { from: 'GhostBridge', at: '9:36 PM', text: 'come alone. tell no one. not dana.' },
          { from: 'SunflwrC81', at: '9:36 PM', text: 'ur being so dramatic tonight lol' },
          { from: 'GhostBridge', at: '9:37 PM', text: 'and delete these logs after. all of them. promise me.' },
          { from: 'SunflwrC81', at: '9:37 PM', text: 'FINE i promise. this better be good mel' },
          { from: 'GhostBridge', at: '9:38 PM', text: 'it will all make sense at the overlook.' },
          { from: 'GhostBridge', at: '9:38 PM', text: 'goodnight casey' },
          { from: 'SunflwrC81', at: '9:39 PM', text: 'ok NOW i know something is up. u never say goodnight like that' },
          { from: 'SunflwrC81', at: '9:39 PM', text: 'mel?' },
          { from: 'SunflwrC81', at: '9:41 PM', text: 'hello??' },
        ],
      },
    },

    // =====================================================================
    // RECYCLE BIN
    // =====================================================================
    { id: 'folder.recycle', kind: 'folder', name: 'Recycle Bin', icon: 'trash' },
    {
      id: 'trash.essay-draft',
      kind: 'trash_item',
      name: 'english_essay_draft1.txt',
      icon: 'doc',
      parentId: 'folder.recycle',
      meta: {
        deletedAt: '1997-10-08',
        originalPath: 'C:\\My Documents\\School',
        sizeKb: 2,
      },
      body: {
        text: `The Homefront Economy
by Casey Brennan

The Civil War was a war that happened in America between 1861 and

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
        photoSrc: '/photos/old_wallpaper.svg',
      },
    },
    {
      id: 'trash.invite-list',
      kind: 'trash_item',
      name: 'sat_invite_list.txt',
      icon: 'doc',
      parentId: 'folder.recycle',
      meta: {
        deletedAt: '1997-10-10',
        originalPath: 'C:\\My Documents',
        sizeKb: 1,
      },
      body: {
        text: `reservoir sat (beccas thing)
- me
- becca (obv)
- dana
- mel?? (portvale, probably not)
- tyler + the other tyler
- NOT brandon. becca's rules. long story.`,
      },
    },

    // =====================================================================
    // SHORTCUTS (desktop + start menu launchers)
    // =====================================================================
    {
      id: 'shortcut.mail',
      kind: 'shortcut',
      name: 'WestWind Mail',
      icon: 'mail-app',
      meta: { appId: 'mail', desktop: { x: 120, y: 120 } },
    },
    {
      id: 'shortcut.buddyline',
      kind: 'shortcut',
      name: 'BuddyLine',
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
      name: 'Jotter',
      icon: 'notepad',
      meta: { appId: 'notepad', desktop: { x: 216, y: 24 } },
    },
    {
      id: 'shortcut.recycle',
      kind: 'shortcut',
      name: 'Recycle Bin',
      icon: 'trash',
      meta: { appId: 'recycle', desktop: { x: 24, y: 408 } },
    },
    {
      id: 'shortcut.cardshark',
      kind: 'shortcut',
      name: 'CardShark 2',
      icon: 'game',
      meta: { appId: 'cardshark', desktop: { x: 216, y: 120 } },
    },

    // =====================================================================
    // BOOKMARKS
    // =====================================================================
    { id: 'folder.bookmarks', kind: 'folder', name: 'Bookmarks', icon: 'folder' },
    {
      id: 'bm.searchhound',
      kind: 'bookmark',
      name: 'SearchHound',
      parentId: 'folder.bookmarks',
      meta: { url: 'www.searchhound.net' },
    },
    {
      id: 'bm.mypage',
      kind: 'bookmark',
      name: 'my page!!',
      parentId: 'folder.bookmarks',
      meta: { url: 'www.citypages.net/~sunflwrc81' },
    },
    {
      id: 'bm.melpage',
      kind: 'bookmark',
      name: "mel's page",
      parentId: 'folder.bookmarks',
      meta: { url: 'www.citypages.net/~melwave' },
    },
    {
      id: 'bm.solarflare',
      kind: 'bookmark',
      name: 'SOLAR FLARE official',
      parentId: 'folder.bookmarks',
      meta: { url: 'www.solarflareband.net' },
    },
    {
      id: 'bm.ledger',
      kind: 'bookmark',
      name: 'Maple Glen Ledger',
      parentId: 'folder.bookmarks',
      meta: { url: 'www.mapleglenledger.net' },
    },

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
            text: 'Tip: To find a person\'s home page, put their name in quotes: "casey brennan". To require a word, put + in front of it. Rex ignores the + but appreciates the effort.',
          },
          { t: 'hr' },
          {
            t: 'p',
            text: 'SearchHound indexes 4,081,226 pages found on 21,407 servers, refreshed nightly by our tireless crawler, Rex. Rex is very proud of this and would like you to know.',
          },
          {
            t: 'small',
            text: 'Or browse by topic: Arts & Entertainment · Computers & Internet · News & Media · Recreation · Regional: Pacific Northwest · Society & Culture',
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
      searchText: 'casey brennan maple glen personal homepage sunflower',
      body: {
        style: { bg: '#000033', fg: '#ffffcc', link: '#66ffff', font: 'sans', centered: true, accent: '#ff66cc' },
        blocks: [
          { t: 'h', text: '~*~ welcome to casey\'s corner ~*~' },
          { t: 'marquee', text: 'you are visitor number one zillion. under construction FOREVER.' },
          { t: 'img', caption: '[ spinning sunflower gif ]' },
          { t: 'p', text: 'hi i\'m casey. 16. maple glen (if you know where that is i\'m so sorry). i like: solar flare, my cat buster, writing stories i never finish, the fair, my friends.' },
          { t: 'p', text: 'i dislike: algebra, chain letters (BECCA), when the modem drops you at 11:58 pm.' },
          { t: 'hr' },
          { t: 'sub', text: 'cool links' },
          { t: 'link', text: 'SOLAR FLARE official site', url: 'www.solarflareband.net' },
          { t: 'link', text: "mel's page (she updates it NEVER)", url: 'www.citypages.net/~melwave' },
          { t: 'link', text: 'SearchHound', url: 'www.searchhound.net' },
          { t: 'hr' },
          { t: 'small', text: 'sign my guestbook!! (guestbook broken since june. it counts the thought.)' },
          { t: 'counter', value: 1204 },
        ],
      },
    },
    {
      id: 'web.mel-page',
      kind: 'webpage',
      name: "mel's wave page",
      meta: { url: 'www.citypages.net/~melwave', siteTitle: "mel's page" },
      searchText: 'mel melissa page maple glen',
      body: {
        style: { bg: '#ccffff', fg: '#000066', link: '#cc0066', font: 'sans', centered: true },
        blocks: [
          { t: 'h', text: "mel's page" },
          { t: 'p', text: 'this is my page. my friend casey made most of it because i "wasn\'t doing it right." i was doing it fine.' },
          { t: 'img', caption: '[ picture of a wave. it took 4 minutes to load. worth it? ]' },
          { t: 'list', items: ['things i like: swimming, my cousins, dogs that look like their owners', 'things i do not like: making web pages'] },
          { t: 'hr' },
          { t: 'small', text: 'last updated: march 1997 (casey stop emailing me about this)' },
          { t: 'counter', value: 87 },
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
          { t: 'p', text: 'FALL TOUR ON SALE NOW. Portvale, Riverton, Cascade City, Meridian. All ages except Meridian (sorry, Meridian).' },
          { t: 'link', text: 'join the FAN CIRCLE mailing list', url: 'www.solarflareband.net' },
          { t: 'hr' },
          { t: 'small', text: 'webmaster: dennis. yes the drummer. no i will not fix the guestbook.' },
        ],
      },
    },
    {
      id: 'web.ledger',
      kind: 'webpage',
      name: 'Maple Glen Ledger',
      meta: { url: 'www.mapleglenledger.net', siteTitle: 'The Maple Glen Ledger — Online Edition' },
      searchText: 'maple glen ledger news casey brennan missing search reservoir overlook',
      body: {
        style: { bg: '#ffffff', fg: '#111111', link: '#0000aa', font: 'serif' },
        blocks: [
          { t: 'h', text: 'The Maple Glen Ledger' },
          { t: 'small', text: 'Online Edition — Updated Wednesdays (usually) — Oct. 15, 1997' },
          { t: 'hr' },
          { t: 'sub', text: 'SEARCH FOR MISSING TEEN ENTERS SECOND WEEK' },
          { t: 'p', text: 'The search for Casey Brennan, 16, of Maple Glen, continued this week with volunteers walking the fire roads above the county reservoir. Brennan was last seen the evening of Friday, Oct. 10. Her bicycle was recovered near the Miller Point trailhead the following morning.' },
          { t: 'p', text: 'Sheriff Dale Amundsen urged residents with information to come forward. "Somebody saw something," Amundsen said. "In a town this size, somebody always has."' },
          { t: 'p', text: 'A candlelight vigil is planned Friday at the high school.' },
          { t: 'hr' },
          { t: 'sub', text: 'ALSO THIS WEEK' },
          { t: 'list', items: ['County board delays reservoir fence project a third time', 'Falcons soccer edges Riverton 2-1', 'Harvest Festival parking: what to know (bring quarters)'] },
          { t: 'hr' },
          { t: 'small', text: 'The Ledger Online is a service of Maple Glen Printing & Copy. Story tips: tips@mapleglenledger.net' },
        ],
      },
    },
    {
      id: 'web.mapfinder-overlook',
      kind: 'webpage',
      name: 'MapFinder: Miller Point Overlook',
      meta: { url: 'www.mapfinder.net/maps/miller-point', siteTitle: 'MapFinder — Miller Point Overlook' },
      searchText: 'mapfinder map miller point overlook reservoir fire road directions',
      requires: { discovery: 'overlook-plan' },
      body: {
        style: { bg: '#f4f4e8', fg: '#222222', link: '#006600', font: 'sans' },
        blocks: [
          { t: 'h', text: 'MapFinder' },
          { t: 'small', text: 'Maps for the Modern Motorist — beta' },
          { t: 'hr' },
          { t: 'sub', text: 'Miller Point Overlook — Maple Glen County' },
          { t: 'img', caption: '[ map tile: reservoir, fire road switchbacks, a marked viewpoint at Miller Point ]' },
          { t: 'p', text: 'Access via County Fire Road 7, north of the reservoir pump house. Gate closed to vehicles after dusk. Foot access is not patrolled. Approx. 25 minutes by bicycle from downtown Maple Glen.' },
          { t: 'small', text: 'MapFinder cannot verify current road conditions. Print this page before travelling.' },
        ],
      },
    },
  ],
};
