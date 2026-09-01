/**
 * Procedural 1997 web generator — SERVER-SIDE CONTENT TOOLING.
 *
 * Generates GeoCities-flavored filler pages for the in-game web. Runs inside
 * the content module with a FIXED SEED, so the same neighborhood is generated
 * every time: pages are stable, revisitable, seedable to the DB, and
 * searchable server-side. Nothing here ships to production clients.
 *
 * All names, bands, towns, and people are fictional.
 */

import type { ContentItem, PageBlock, PageStyle } from './types.ts';

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private f: () => number;
  constructor(seed: number) {
    this.f = mulberry32(seed);
  }
  next(): number {
    return this.f();
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

interface Identity {
  username: string;
  display: string;
}

const IDENTITIES: Identity[] = [
  { username: 'starla_moon', display: 'Starla' },
  { username: 'radioactive_dave', display: 'Dave' },
  { username: 'xXwolfpupXx', display: 'wolfpup' },
  { username: 'miss_kitty_meow', display: 'Denise' },
  { username: 'TommyT_78', display: 'Tommy T.' },
  { username: 'moonbeam_pages', display: 'Moonbeam' },
  { username: 'gearhead_gary', display: 'Gary' },
  { username: 'poet_of_the_pines', display: 'R.W.' },
  { username: 'the_hubcap_king', display: 'Hubcap King' },
  { username: 'sk8_or_dye', display: 'Chip' },
  { username: 'valley_vhs', display: 'Vern' },
  { username: 'peggy_sue_crafts', display: 'Peggy Sue' },
  { username: 'bassmaster_bill', display: 'Bill' },
  { username: 'dixie_darlin_64', display: 'Dixie' },
  { username: 'the_real_stretch', display: 'Stretch' },
  { username: 'aunt_carols_kitchen', display: 'Aunt Carol' },
  { username: 'nightowl_ned', display: 'Ned' },
  { username: 'glitterqueen_amy', display: 'Amy' },
  { username: 'coalcamp_kid', display: 'Junior' },
  { username: 'mothman_saw_me', display: 'Perry' },
  { username: 'crick_walker', display: 'Delmar' },
  { username: 'blue_ridge_betty', display: 'Betty' },
  { username: 'zzguitarzz', display: 'Row' },
  { username: 'the_soap_report', display: 'Fran' },
  { username: 'hoot_owl_holler', display: 'Orville' },
  { username: 'kaylas_korner_97', display: 'Kayla' },
  { username: 'scanner_land', display: 'Big Ear' },
  { username: 'muffler_man_mel', display: 'Mel' },
  { username: 'pixel_prairie', display: 'Lou' },
  { username: 'grandpa_dobbs', display: 'Grandpa Dobbs' },
  { username: 'tape_trader_tina', display: 'Tina' },
  { username: 'holler_hoops', display: 'Coach D.' },
  { username: 'wanda_of_the_woods', display: 'Wanda' },
  { username: 'the_bug_guy', display: 'Bug Guy' },
  { username: 'quilt_till_you_wilt', display: 'Ruthanne' },
  { username: 'roadkill_cafe_fan', display: 'Skeeter' },
  { username: 'midnight_bowler', display: 'Curtis' },
  { username: 'ferretmom4', display: 'Sharon' },
  { username: 'wv_train_watcher', display: 'Albert' },
  { username: 'sallys_seashells', display: 'Sally' },
  { username: 'the_last_arcade', display: 'Pinball Paul' },
  { username: 'garden_gal_gail', display: 'Gail' },
  { username: 'ham_radio_hank', display: 'Hank' },
  { username: 'clip_art_cathy', display: 'Cathy' },
  { username: 'deerstand_dan', display: 'Dan' },
  { username: 'polka_all_night', display: 'Stanley' },
  { username: 'root_cellar_recipes', display: 'Maybelle' },
  { username: 'vcr_repair_vic', display: 'Vic' },
  { username: 'stargazer_susie', display: 'Susie' },
  { username: 'the_whittler', display: 'Emmett' },
  { username: 'lucky_horseshoe_lil', display: 'Lil' },
  { username: 'dialtone_dennis', display: 'Dennis H.' },
];

const TILES: NonNullable<PageStyle['bgTile']>[] = ['stars', 'clouds', 'plaid', 'marble', 'hearts', 'grid'];

const PALETTES: Array<Pick<PageStyle, 'bg' | 'fg' | 'link' | 'accent'>> = [
  { bg: '#000022', fg: '#ccffcc', link: '#66ffff', accent: '#ff66cc' },
  { bg: '#ffffcc', fg: '#333300', link: '#0000cc', accent: '#cc6600' },
  { bg: '#220033', fg: '#ffccff', link: '#ffff66', accent: '#66ff66' },
  { bg: '#ccffff', fg: '#003333', link: '#cc0066', accent: '#006666' },
  { bg: '#111111', fg: '#00ff00', link: '#ff9900', accent: '#ff0000' },
  { bg: '#ffeeee', fg: '#331111', link: '#990000', accent: '#cc3366' },
];

const BADGES = [
  'NetVoyager NOW', '800x600 4EVER', 'MIDI INSIDE', 'FREE SPEECH ONLINE',
  'KAVA POWERED', 'CITYPAGES MEMBER', 'GET WESTWIND', 'ANTI-FRAME LEAGUE',
  'Y2K READY (almost)', 'THIS SITE USES TABLES',
];

const MIDIS = [
  'canyon_theme.mid', 'axel_f_cover.mid', 'moonlight_snta.mid', 'sk8ordie.mid',
  'wedding_march.mid', 'x_files_ish.mid', 'fur_elise_fast.mid',
];

const DIVIDERS: Array<'rainbow' | 'dots' | 'zigzag'> = ['rainbow', 'dots', 'zigzag'];

const UPDATED = [
  'August 4, 1997', 'September 12, 1997', 'September 30, 1997',
  'October 2, 1997', 'October 11, 1997', 'June 8, 1996 (sorry)',
];

// ---------------------------------------------------------------------------
// Archetype builders
// ---------------------------------------------------------------------------

interface PageDraft {
  title: string;
  siteTitle: string;
  searchText: string;
  blocks: PageBlock[];
}

type Builder = (rng: Rng, id: Identity) => PageDraft;

const personal: Builder = (rng, id) => ({
  title: `${id.display}'s homepage`,
  siteTitle: `~*~ ${id.display}'s Home Page ~*~`,
  searchText: `${id.username} ${id.display} personal homepage about me`,
  blocks: [
    { t: 'h', text: `~*~ Welcome to ${id.display}'s Home Page ~*~` },
    { t: 'blink', text: rng.pick(['YOU are visitor number a lot!!', 'NEW STUFF ADDED!!', 'now with 100% more pictures']) },
    { t: 'divider', kind: rng.pick(DIVIDERS) },
    { t: 'p', text: `Hi, I'm ${id.display}. ${rng.pick([
      'This page is about me and the stuff I like. It took me all summer.',
      'I made this page at the library. Please be patient, it is a work in progress.',
      "My nephew showed me how to make this. I'm still learning where everything goes.",
      'I have a lot of opinions and now they are on the information superhighway.',
    ])}` },
    { t: 'sub', text: 'Things I like:' },
    { t: 'list', items: rng.shuffle([
      'bowling league (Tuesdays)', 'my truck', 'the X-Files (the show like it)',
      'garage sales', 'making web pages apparently', 'my family (most of them)',
      'cooking-out', 'tapes',
    ]).slice(0, rng.int(3, 5)) },
    { t: 'construction' },
    { t: 'guestbook', count: rng.int(3, 88) },
    { t: 'counter', value: rng.int(214, 9999) },
    { t: 'updated', date: rng.pick(UPDATED) },
  ],
});

const fanshrine: Builder = (rng, id) => {
  const subject = rng.pick([
    { name: 'VELVET JUNE', kind: 'band', line: 'the most underrated band of the decade. i said what i said.' },
    { name: 'HARBOR POINT', kind: 'TV show', line: 'tuesday nights. do NOT call my house on tuesday nights.' },
    { name: 'SOLAR FLARE', kind: 'band', line: 'i have seen them 4 times. yes i cried. no i will not elaborate.' },
  ]);
  return {
    title: `${subject.name} shrine`,
    siteTitle: `${subject.name} 4-EVER (${id.display}'s shrine)`,
    searchText: `${subject.name} fan shrine ${subject.kind} ${id.username}`,
    blocks: [
      { t: 'blink', text: `*** THE UNOFFICIAL ${subject.name} SHRINE ***` },
      { t: 'h', text: `${subject.name} 4-EVER` },
      { t: 'p', text: subject.line },
      { t: 'divider', kind: rng.pick(DIVIDERS) },
      { t: 'img', caption: `[ ${rng.int(14, 60)} photos, each one takes ${rng.int(2, 5)} minutes to load, worth it ]` },
      { t: 'sub', text: 'Why they are the best (a partial list):' },
      { t: 'list', items: rng.shuffle([
        'the lyrics UNDERSTAND me', 'saw them live and my life changed',
        'better than everything else combined', 'my mom even likes them',
        'track 5. just listen to track 5.',
      ]).slice(0, 3) },
      { t: 'midi', file: rng.pick(MIDIS) },
      { t: 'badges', labels: rng.shuffle(BADGES).slice(0, rng.int(3, 5)) },
      { t: 'guestbook', count: rng.int(12, 240) },
      { t: 'counter', value: rng.int(1000, 45000) },
    ],
  };
};

const petpage: Builder = (rng, id) => {
  const pet = rng.pick([
    { name: 'Mr. Biscuit', species: 'cat', bio: 'he is 14 pounds of attitude and we love him' },
    { name: 'Duchess', species: 'dog', bio: 'she has never once fetched anything. queen behavior.' },
    { name: 'Gerald', species: 'parakeet', bio: 'he says "hello" and one swear word we cannot un-teach him' },
  ]);
  return {
    title: `${pet.name}'s page`,
    siteTitle: `The Official Home Page of ${pet.name} the ${pet.species}`,
    searchText: `${pet.name} ${pet.species} pet page ${id.username}`,
    blocks: [
      { t: 'h', text: `${pet.name} Online` },
      { t: 'small', text: `the official home page of ${pet.name} the ${pet.species}. yes he has a web page. it's 1997.` },
      { t: 'img', caption: `[ ${pet.name} looking directly at the camera. majestic. ]` },
      { t: 'p', text: pet.bio },
      { t: 'divider', kind: 'dots' },
      { t: 'sub', text: `${pet.name}'s likes:` },
      { t: 'list', items: rng.shuffle(['dinner', 'second dinner', 'the good chair', 'ignoring commands', 'the vacuum (enemy)', 'sunbeams']).slice(0, 4) },
      { t: 'guestbook', count: rng.int(5, 60) },
      { t: 'counter', value: rng.int(300, 8000) },
      { t: 'updated', date: rng.pick(UPDATED) },
    ],
  };
};

const weird: Builder = (rng, id) => ({
  title: 'THE TRUTH page',
  siteTitle: `THE TRUTH IS OUT THERE (${id.display}'s files)`,
  searchText: `ufo lights truth conspiracy ${id.username} paranormal`,
  blocks: [
    { t: 'blink', text: 'THEY DON\'T WANT YOU TO READ THIS PAGE' },
    { t: 'h', text: 'THE TRUTH FILES' },
    { t: 'p', text: rng.pick([
      'On the night of March 14 I saw three lights over the ridge moving in formation. The county says "weather balloon." THREE weather balloons? In FORMATION?',
      'I have collected 41 eyewitness accounts of the lights. The newspaper will not return my calls. That tells you everything.',
    ]) },
    { t: 'divider', kind: 'zigzag' },
    { t: 'sub', text: 'EVIDENCE:' },
    { t: 'list', items: ['blurry photo #1 (very compelling)', 'blurry photo #2 (even better)', 'my cousin\'s testimony (he was THERE)', 'a diagram i made'] },
    { t: 'img', caption: '[ diagram: the ridge, three circles, many arrows, the word "WHY??" ]' },
    { t: 'p', text: 'I am not crazy. I am ORGANIZED.' },
    { t: 'badges', labels: rng.shuffle(BADGES).slice(0, 3) },
    { t: 'counter', value: rng.int(666, 13000) },
    { t: 'updated', date: rng.pick(UPDATED) },
  ],
});

const business: Builder = (rng, id) => {
  const biz = rng.pick([
    { name: "Big Tony's Pizza Cave", tag: 'Home of the 2-Pound Slice', hours: 'Tue-Sun 11am-10pm (closed Mondays, Tony bowls)' },
    { name: 'Video Barn', tag: 'New Releases Every Friday!', hours: 'Every day 10am-midnight. BE KIND, REWIND.' },
    { name: "Kowalski's Bait & Tackle", tag: 'Worms. We Have Worms.', hours: 'Dawn til whenever Ron gets tired' },
  ]);
  return {
    title: biz.name,
    siteTitle: `${biz.name} — ${biz.tag}`,
    searchText: `${biz.name} local business hours ${id.username}`,
    blocks: [
      { t: 'h', text: biz.name },
      { t: 'sub', text: biz.tag },
      { t: 'divider', kind: 'rainbow' },
      { t: 'p', text: `HOURS: ${biz.hours}` },
      { t: 'p', text: `CALL US: 555-0${rng.int(100, 199)}. Ask for ${rng.pick(['Tony', 'Ron', 'Deb', 'the manager (also Tony)'])}.` },
      { t: 'img', caption: '[ scanned photo of the storefront. slightly crooked. ]' },
      { t: 'small', text: rng.pick([
        'This web page was made by the owner\'s son as a school project. Be nice.',
        'We are on the World Wide Web now. The future is here and it is confusing.',
      ]) },
      { t: 'construction' },
      { t: 'counter', value: rng.int(50, 900) },
    ],
  };
};

const poetry: Builder = (rng, id) => ({
  title: `${id.display}'s poetry corner`,
  siteTitle: `Whispers of the Pines — poetry by ${id.display}`,
  searchText: `poetry poems writing ${id.username} pines whispers`,
  blocks: [
    { t: 'h', text: 'Whispers of the Pines' },
    { t: 'small', text: `original poetry by ${id.display}. please do not steal my poems. i will know.` },
    { t: 'divider', kind: 'dots' },
    { t: 'sub', text: rng.pick(['"October"', '"The Reservoir"', '"Untitled #7"']) },
    { t: 'p', text: rng.pick([
      'the fog comes down the valley / like a secret nobody asked for / and the town pretends not to notice / (it notices)',
      'gravel road, porch light, moth / three things that wait / i am at least two of them',
      'the water tower says our name / to every passing plane / nobody ever waves back',
    ]) },
    { t: 'small', text: '(c) 1997. all rights reserved. seriously.' },
    { t: 'guestbook', count: rng.int(2, 19) },
    { t: 'updated', date: rng.pick(UPDATED) },
  ],
});

const recipes: Builder = (rng, id) => ({
  title: `${id.display}'s recipe box`,
  siteTitle: `${id.display}'s Recipe Box (from the valley)`,
  searchText: `${id.username} recipes cooking casserole valley kitchen`,
  blocks: [
    { t: 'h', text: `${id.display}'s Recipe Box` },
    { t: 'small', text: 'family recipes, typed up one at a time. measurements approximate. so was grandma.' },
    { t: 'divider', kind: rng.pick(DIVIDERS) },
    { t: 'sub', text: rng.pick(['THIS WEEK: funeral potatoes', 'THIS WEEK: apple stack cake', 'THIS WEEK: brown beans & cornbread', 'THIS WEEK: church-window cookies']) },
    { t: 'p', text: rng.pick([
      'Start with a can of cream of mushroom. Honestly most of these start with a can of cream of mushroom.',
      'Bake at 350 until it looks right. You know what right looks like. Your mother showed you.',
      'Double it if company is coming. Company is always coming.',
    ]) },
    { t: 'list', items: rng.shuffle([
      'do NOT use the store-brand crackers, we tried it once',
      'the secret ingredient is a longer bake than the box says',
      'this one won a ribbon in 1989 and we do not let anyone forget it',
      'freezes fine, thaws suspicious',
    ]).slice(0, 3) },
    { t: 'guestbook', count: rng.int(6, 120) },
    { t: 'counter', value: rng.int(300, 8000) },
    { t: 'updated', date: rng.pick(UPDATED) },
  ],
});

const huntfish: Builder = (rng, id) => ({
  title: `${id.display}'s outdoor page`,
  siteTitle: `${id.display}'s Hunting & Fishing Report`,
  searchText: `${id.username} hunting fishing river bass deer season report`,
  blocks: [
    { t: 'h', text: `${id.display}'s Hunting & Fishing Report` },
    { t: 'blink', text: rng.pick(['THE CRAPPIE ARE BITING', 'BOW SEASON IS OPEN', 'RIVER IS UP. BE SMART.']) },
    { t: 'divider', kind: rng.pick(DIVIDERS) },
    { t: 'p', text: rng.pick([
      'Water was low this week so we walked in past the second gate. Do not tell everybody about the second gate.',
      'Took the boy out Saturday. He caught more than me and has been informed he is walking home next time.',
      'Nothing moving before noon. Everything moving at dusk. Same as it ever was.',
    ]) },
    { t: 'img', caption: `[ photo: a stringer of ${rng.int(3, 9)} fish, one thumb partially over the lens ]` },
    { t: 'list', items: rng.shuffle([
      'spot report: the bend past the trailhead (crowded now, thanks a lot)',
      'lure of the month: whatever is dented',
      'reminder: license renews in january, learned that the hard way',
      'the game warden reads this page. hi Roy.',
    ]).slice(0, 3) },
    { t: 'badges', labels: rng.shuffle(BADGES).slice(0, rng.int(2, 4)) },
    { t: 'counter', value: rng.int(500, 15000) },
    { t: 'updated', date: rng.pick(UPDATED) },
  ],
});

const BUILDERS: Builder[] = [personal, fanshrine, petpage, weird, business, poetry, recipes, huntfish];

// ---------------------------------------------------------------------------
// Neighborhood generation
// ---------------------------------------------------------------------------

export interface ExtraDirectoryEntry {
  title: string;
  url: string;
}

export function generateNeighborhood(
  seed: number,
  count: number,
  extras: ExtraDirectoryEntry[] = [],
): ContentItem[] {
  const rng = new Rng(seed);
  const ids = rng.shuffle(IDENTITIES).slice(0, count);
  const builders = rng.shuffle(
    Array.from({ length: count }, (_, i) => BUILDERS[i % BUILDERS.length]),
  );

  const urls = ids.map((id) => `www.citypages.net/~${id.username}`);
  const ringName = 'The Valley Web Ring';

  const pages: ContentItem[] = ids.map((id, i) => {
    const draft = builders[i](rng, id);
    const palette = rng.pick(PALETTES);
    const style: PageStyle = {
      ...palette,
      font: rng.pick(['sans', 'serif'] as const),
      centered: rng.chance(0.7),
      bgTile: rng.chance(0.55) ? rng.pick(TILES) : undefined,
    };
    // Every member page joins the ring — the period's answer to discovery.
    const blocks: PageBlock[] = [
      ...draft.blocks,
      {
        t: 'webring',
        ring: ringName,
        prevUrl: urls[(i - 1 + urls.length) % urls.length],
        nextUrl: urls[(i + 1) % urls.length],
      },
    ];
    return {
      id: `web.gen.${id.username}`,
      kind: 'webpage',
      name: draft.title,
      meta: { url: urls[i], siteTitle: draft.siteTitle },
      searchText: draft.searchText,
      body: { style, blocks },
    };
  });

  const directory: ContentItem = {
    id: 'web.citypages-directory',
    kind: 'webpage',
    name: 'CityPages member directory',
    meta: { url: 'www.citypages.net', siteTitle: 'CityPages — Free Home Pages For Everyone' },
    searchText: 'citypages directory members home pages free hosting',
    body: {
      style: { bg: '#ffffff', fg: '#111111', link: '#0000cc', font: 'sans', centered: true },
      blocks: [
        { t: 'h', text: 'CityPages' },
        { t: 'small', text: 'Free Home Pages For Everyone — 2MB free! — a Meridian Digital Systems community' },
        { t: 'divider', kind: 'rainbow' },
        { t: 'sub', text: 'Member Directory (newest first)' },
        ...[...extras, ...ids.map((_id, i) => ({ title: pages[i].meta!.siteTitle!, url: urls[i] }))].map(
          (e): PageBlock => ({ t: 'link', text: e.title, url: e.url }),
        ),
        { t: 'divider', kind: 'dots' },
        { t: 'small', text: 'Want a page? Mail hostmaster@citypages.net with your WestWind account. Allow 6-8 weeks. We are one guy.' },
        { t: 'counter', value: 88041 },
      ],
    },
  };

  return [...pages, directory];
}
