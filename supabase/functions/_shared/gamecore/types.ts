/**
 * Shared game-core types.
 *
 * IMPORTANT: `ContentItem`, `SeasonContent` and everything that can carry
 * `requires` / `password` / `onOpen` are SERVER-ONLY shapes. The client may
 * only ever receive the DTO types at the bottom of this file
 * (`ItemSummary`, `ItemContent`, `StateView`, ...), produced by redact.ts.
 */

// ---------------------------------------------------------------------------
// Requirements (server-side only)
// ---------------------------------------------------------------------------

export type Requirement =
  | { all: Requirement[] }
  | { any: Requirement[] }
  | { discovery: string }
  | { opened: string }
  | { unlocked: string }
  | { flag: string };

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

export type ItemKind =
  | 'folder'
  | 'document'
  | 'photo'
  | 'shortcut' // launches an app (meta.appId) or a URL (meta.url)
  | 'bookmark' // browser bookmark, meta.url
  | 'mailbox'
  | 'email'
  | 'im_conversation'
  | 'webpage'
  | 'trash_item'
  /** A sound file (opens in Sound Recorder). meta.audioSrc points at the
   * authorized asset; body.text carries the transcript/description. */
  | 'audio';

export interface ImMessage {
  from: string; // screen name
  at: string; // in-world timestamp, e.g. "10:12 PM"
  text: string;
}

export type PageBlock =
  | { t: 'h'; text: string }
  | { t: 'sub'; text: string }
  | { t: 'p'; text: string }
  | { t: 'small'; text: string }
  | { t: 'link'; text: string; url: string }
  | { t: 'list'; items: string[] }
  | { t: 'hr' }
  | { t: 'img'; caption: string; src?: string }
  | { t: 'counter'; value: number }
  | { t: 'marquee'; text: string }
  /** The site's search form, rendered by the in-game browser at this spot. */
  | { t: 'searchform' }
  // --- 1997 web furniture (rendered by the in-game browser) ---
  | { t: 'divider'; kind?: 'rainbow' | 'dots' | 'zigzag' }
  | { t: 'badges'; labels: string[] }
  | { t: 'construction' }
  | { t: 'webring'; ring: string; prevUrl: string; nextUrl: string }
  | { t: 'blink'; text: string }
  | { t: 'midi'; file: string }
  | { t: 'guestbook'; count: number }
  | { t: 'updated'; date: string };

export interface PageStyle {
  bg: string;
  fg: string;
  link: string;
  font: 'serif' | 'sans' | 'mono';
  centered?: boolean;
  accent?: string;
  /** Tiled background texture, the GeoCities way. */
  bgTile?: 'stars' | 'clouds' | 'plaid' | 'marble' | 'hearts' | 'grid';
}

export interface ItemMeta {
  // filesystem
  createdAt?: string;
  modifiedAt?: string;
  sizeKb?: number;
  path?: string;
  // email
  from?: string;
  to?: string;
  date?: string;
  // instant messenger
  screenname?: string;
  alias?: string;
  logDate?: string;
  // web
  url?: string;
  siteTitle?: string;
  // photos
  caption?: string;
  photoSrc?: string;
  // audio files (kind 'audio'): the authorized recording asset
  audioSrc?: string;
  /** Recording length, seconds — shown by Sound Recorder. */
  audioSeconds?: number;
  // recycle bin
  deletedAt?: string;
  originalPath?: string;
  // desktop placement
  desktop?: { x: number; y: number };
  /** Render this document in monospace (column-aligned evidence: the
   * ledger, modem.log). Everything else reads proportionally. */
  mono?: boolean;
  // shortcuts
  appId?: string;
  // evidence copies: the original item this copy was taken from
  sourceId?: string;
}

export interface ItemBody {
  text?: string;
  messages?: ImMessage[];
  blocks?: PageBlock[];
  style?: PageStyle;
}

export interface ContentItem {
  id: string;
  kind: ItemKind;
  name: string;
  parentId?: string;
  icon?: string;
  meta?: ItemMeta;
  body?: ItemBody;
  /** Visibility gate. Items failing this are never listed nor openable. SERVER ONLY. */
  requires?: Requirement;
  /** If set, item is listed but content is withheld until unlocked. SERVER ONLY. */
  password?: string;
  /** Hint shown with the password prompt (safe to send once the prompt is shown). */
  passwordHint?: string;
  /** Effects when the item is opened for the first time. SERVER ONLY. */
  onOpen?: { discover?: string[]; setFlags?: Record<string, boolean> };
  /** Extra keywords for the in-game search engine. SERVER ONLY (never sent raw). */
  searchText?: string;
  /**
   * When the referenced item has any accessible children, this item's icon
   * is served with a `-full` suffix (the bulging bin).
   */
  fullWhenHasChildren?: string;
  /**
   * This item (an email, typically) is not on the machine yet: it ARRIVES
   * over the wire. It stays invisible until a delivery sweep runs while the
   * player is online AND its `requires` are met; once delivered it persists
   * offline like anything else on the disk. SERVER ONLY.
   */
  arrivesOnline?: boolean;
}

export interface Discovery {
  id: string;
  title: string;
  description: string;
  endsDemo?: boolean;
}

export type BuddyStatus = 'online' | 'offline' | 'away' | 'idle';

export interface Buddy {
  screenname: string;
  alias?: string;
  group: string;
  status: BuddyStatus;
  awayMessage?: string;
  conversationId?: string;
  requires?: Requirement; // SERVER ONLY
  /**
   * Conditional presence changes, evaluated in order; the LAST matching
   * override wins (e.g. GhostBridge signs on after the finale, then signs
   * back off once spoken to). SERVER ONLY — only the resolved status ships.
   */
  overrides?: Array<{ requires: Requirement; status: BuddyStatus; awayMessage?: string }>;
}

// ---------------------------------------------------------------------------
// Live conversations (server-authored prompt trees; the player never types
// free text — they choose from prompts the server currently offers)
// ---------------------------------------------------------------------------

export interface ChatPrompt {
  /** Unique within its conversation. */
  id: string;
  /** The line the player sends. */
  text: string;
  /** The buddy's reply lines, delivered in order. */
  replies: string[];
  /** When this prompt is offered. SERVER ONLY. */
  requires?: Requirement;
  /** Discoveries granted when the player says it. SERVER ONLY. */
  discover?: string[];
  /** Flags set when the player says it. SERVER ONLY. */
  setFlags?: Record<string, boolean>;
  /** The buddy signs off after replying (roster status via overrides). */
  signOff?: boolean;
}

/**
 * A line (or lines) the BUDDY sends unprompted once its requirements are
 * met — typically a flag set by a scheduled event. Anchored into the
 * rebuilt transcript after the named exchange (after the opener when no
 * anchor is given).
 */
export interface ChatInterjection {
  /** Unique within its conversation. */
  id: string;
  /** Transcript anchor: insert after this exchange (a prompt id). */
  afterPromptId?: string;
  /** When these lines exist at all. SERVER ONLY. */
  requires?: Requirement;
  lines: string[];
}

export interface ChatConversation {
  /** The buddy this conversation belongs to (must match a roster entry). */
  screenname: string;
  /** When live chat with this buddy is available at all. SERVER ONLY. */
  requires?: Requirement;
  /** Lines the buddy sends when the window first opens. */
  opener: string[];
  /** Every prompt is one-shot: once said, it never re-offers. */
  prompts: ChatPrompt[];
  /** Unprompted lines the buddy volunteers (see ChatInterjection). */
  interjections?: ChatInterjection[];
}

// ---------------------------------------------------------------------------
// Scheduled events (server-authored ambient life)
// ---------------------------------------------------------------------------

/**
 * A notice the engine stamps onto the result of the action during which
 * something happened on the wire. It is the ONLY way ambient events reach
 * the client — client code never knows what an event means, only how to
 * chirp and toast about it. All text here is server-authored.
 */
export interface WireNotice {
  kind: 'mail' | 'im' | 'buddy-on' | 'buddy-off' | 'roster' | 'system' | 'remote';
  /** Toast title/body. Optional — the client has generic per-kind fallbacks. */
  title?: string;
  text?: string;
  /** For 'im': the buddy whose window should open (server data, not client copy). */
  screenname?: string;
}

/**
 * A content-authored ambient event: N seconds into the current dial-up
 * session, if `requires` are met, it fires exactly once per season. Effects
 * are FLAGS ONLY — everything downstream (mail arriving, buddy presence,
 * chat interjections) hangs off those flags through the existing gating
 * machinery. SERVER ONLY.
 */
export interface ScheduledEvent {
  id: string;
  /** Seconds into the current connection before this may fire. */
  afterOnlineSeconds: number;
  requires?: Requirement;
  setFlags?: Record<string, boolean>;
  /** What the client shows/plays when it fires (omit for a silent change). */
  notice?: WireNotice;
}

// ---------------------------------------------------------------------------
// Remote access (the takeover set-piece)
// ---------------------------------------------------------------------------

/** One beat of a remote-access script, played back by the takeover screen.
 * `cmd` text is typed character-by-character on a fixed clock and must
 * include its own prompt (e.g. "C:\\>vol") — the client renders, never
 * composes. SERVER ONLY until triggered; served whole once earned. */
export type RemoteScriptLine =
  | { t: 'sys'; text: string }
  | { t: 'cmd'; text: string }
  | { t: 'out'; lines: string[] }
  | { t: 'pause'; ms: number };

/**
 * A story set-piece: while the player is online, the GUI drops and someone
 * dials INTO the machine. Triggers like a scheduled event (delay into the
 * current connection + requirements), fires once per season, and must then
 * be watched: the client plays the script and acknowledges, which applies
 * `onDone` and drops the connection. SERVER ONLY.
 */
export interface RemoteAccessSequence {
  id: string;
  afterOnlineSeconds: number;
  requires?: Requirement;
  script: RemoteScriptLine[];
  onDone?: { setFlags?: Record<string, boolean>; discover?: string[] };
}

// ---------------------------------------------------------------------------
// Case handler (the diegetic frame: whose machine is this, and why are we
// allowed to be here)
// ---------------------------------------------------------------------------

/** One memo from the case handler. Progress-gated like everything else;
 * every word is story data — the client app renders, never writes. */
export interface HandlerMessage {
  id: string;
  /** In-world date shown on the memo. */
  date?: string;
  from?: string;
  subject?: string;
  requires?: Requirement; // SERVER ONLY
  lines: string[];
  /**
   * A playable voice recording attached to this message (authorized asset
   * path, e.g. "/audio/briefing.mp3"). The lines above double as its
   * transcript. Reserve for important moments — routine traffic is text.
   */
  audioSrc?: string;
}

/** One page of the Case Files first-run setup wizard. Story data. */
export interface HandlerSetupPage {
  title: string;
  lines: string[];
}

export interface CaseHandler {
  /** The header the Case Files app shows (e.g. the case number). */
  title: string;
  /** The Case Summary page: official background only — facts the case
   * has already given the player, never conclusions. Story data. */
  summary?: string[];
  /**
   * First-launch setup wizard pages, shown once (engine gates on the
   * case-setup-done flag). The client renders them verbatim between its
   * generic Welcome/Finish chrome and the sync step.
   */
  setup?: HandlerSetupPage[];
  messages: HandlerMessage[];
}

export interface SeasonContent {
  slug: string;
  title: string;
  /** In-world "now". The player's real clock is never used for in-world time. */
  clock: { now: string };
  computer: {
    owner: string;
    loginUser: string;
    /** Password target id for the OS login (an entry in `passwords`). */
    loginTargetId: string;
    /**
     * The hint the machine's owner typed when setting their password.
     * SERVED ONLY after enough failed attempts (see engine) — it reaches
     * StateView/login results gated, never unconditionally.
     */
    loginHint?: string;
    /** The word the owner set in their screen saver. Sometimes a clue. */
    saverText?: string;
    /** The owner's instant-messenger screen name (the player chats as it). */
    imScreenname?: string;
    /**
     * Extra lines the BIOS prints during the POST (e.g. an improper-shutdown
     * warning). Story data — served via StateView, never client-coded.
     */
    bootWarning?: string[];
    /** DOS volume label/serial (shown by `vol` and `dir`). Sometimes a clue. */
    dosVolume?: { label: string; serial: string };
  };
  /** Standalone password targets (e.g. the OS login itself). SERVER ONLY values. */
  passwords: Record<string, { password: string; hint?: string }>;
  wallpaper: string;
  homeUrl: string;
  items: ContentItem[];
  /**
   * The Start menu's Documents list: the files Casey opened in her last
   * sessions, most-recent-first (the machine's C:\Windows\Recent, frozen
   * as evidence). Item ids; entries may point at gated or locked content
   * — they serve as name-only dead shortcuts until earned. Max 15.
   */
  recentDocuments?: string[];
  discoveries: Discovery[];
  buddies: Buddy[];
  /** Live prompt-tree conversations (see ChatConversation). SERVER ONLY. */
  conversations?: ChatConversation[];
  /**
   * The one-phone-line scare: once `requires` is met, the NEXT action taken
   * while online drops the connection — someone in the house picked up the
   * extension. Fires exactly once per season. SERVER ONLY.
   */
  linePickup?: { requires: Requirement };
  /** Numbers the Phone Dialer can voice-dial (see PhoneNumber). SERVER ONLY. */
  phones?: PhoneNumber[];
  /** Timed ambient events, swept while the player is online. SERVER ONLY. */
  schedule?: ScheduledEvent[];
  /** Remote-access takeover set-pieces (see RemoteAccessSequence). SERVER ONLY. */
  remoteAccess?: RemoteAccessSequence[];
  /** The case handler's memos (see CaseHandler). SERVER ONLY values. */
  handler?: CaseHandler;
  maxPasswordAttempts: number;
  lockoutSeconds: number;
}

/**
 * A phone number the machine can voice-dial through the Phone Dialer.
 * Flavor, not clues — what a phone in this house reaches in 1997.
 */
export interface PhoneNumber {
  /** Digits only (the engine normalizes what the player dials). */
  number: string;
  /** Speed-dial label the owner programmed (absent = not on speed dial). */
  label?: string;
  requires?: Requirement;
  outcome: 'busy' | 'no-answer' | 'message';
  /** What the caller hears, line by line (outcome 'message'). */
  message?: string[];
  /** A modem answers: the client plays a carrier squeal with the message. */
  carrier?: boolean;
}

// ---------------------------------------------------------------------------
// Player state (persisted server-side, per player per season)
// ---------------------------------------------------------------------------

/** A document the PLAYER wrote (via Notepad) — their own notes, saved to the desktop. */
/** A microphone note the player recorded (Case Files / Sound Recorder). */
export interface PlayerAudioNote {
  id: string;
  name: string;
  createdAt: string;
  /** data: URL of the recording (webm/opus). Size-capped by the engine. */
  dataUrl: string;
}

export interface PlayerDocument {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  modifiedAt: string;
  /** When set, the doc lives inside a player folder instead of on the desktop. */
  folderId?: string;
  /** Evidence copies remember the item they were taken from. */
  sourceId?: string;
}

/** A folder the player created on the desktop. */
export interface PlayerFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface PlayerState {
  loggedIn: boolean;
  opened: string[];
  discoveries: string[];
  unlocked: string[];
  flags: Record<string, boolean>;
  ended: boolean;
  passwordAttempts: Record<string, number>;
  /** Real-world epoch ms until which a target refuses attempts. */
  lockedUntil: Record<string, number>;
  /** Player-authored files. Older saved states may lack these fields. */
  documents?: PlayerDocument[];
  /** Microphone notes recorded through Sound Recorder / Case Files. */
  audioNotes?: PlayerAudioNote[];
  docSeq?: number;
  folders?: PlayerFolder[];
  folderSeq?: number;
  /** Per-buddy list of prompt ids the player has said, in order. */
  chats?: Record<string, string[]>;
  /** Dial-up state: the machine starts offline every session-of-record. */
  online?: boolean;
  /** Real epoch ms when the current connection was established. */
  onlineSince?: number;
  /** Ids of arrivesOnline items that have been delivered to the machine. */
  delivered?: string[];
  /** Ids of scheduled events that have fired (each fires once per season). */
  firedEvents?: string[];
  /** Ids of remote-access sequences the player has watched to the end. */
  remoteSeen?: string[];
}

export function newPlayerState(): PlayerState {
  return {
    loggedIn: false,
    opened: [],
    discoveries: [],
    unlocked: [],
    flags: {},
    ended: false,
    passwordAttempts: {},
    lockedUntil: {},
    documents: [],
    docSeq: 0,
  };
}

// ---------------------------------------------------------------------------
// Actions (client -> server)
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'getState' }
  | { type: 'login'; password: string }
  | { type: 'logout' }
  | { type: 'connect' }
  | { type: 'disconnect' }
  | { type: 'checkMail' }
  | { type: 'getDesktop' }
  | { type: 'recentDocs' }
  | { type: 'listChildren'; parentId: string }
  | { type: 'open'; itemId: string }
  | { type: 'attemptPassword'; targetId: string; password: string }
  | { type: 'visit'; url: string }
  | { type: 'search'; query: string }
  /** Find: Files or Folders — name and/or containing-text search over the
   * disk the player can already reach. Never out-runs content gating. */
  | { type: 'findFiles'; query: string; text?: string }
  | { type: 'dial'; number: string }
  | { type: 'getSpeedDial' }
  | { type: 'getBuddies' }
  | { type: 'getConversation'; screenname: string }
  | { type: 'say'; screenname: string; promptId: string }
  | { type: 'getRemoteSession' }
  | { type: 'remoteSessionDone' }
  | { type: 'getCaseFile' }
  /** Finish Case Files first-run setup. Requires the line to be up — the
   * wizard's "connect to case server" step is real: it runs a delivery
   * sweep and unlocks the handler's opening message. */
  | { type: 'caseFileSync' }
  | { type: 'saveDocument'; docId?: string; name: string; text: string; folderId?: string }
  /** Copy a readable text-bearing item into the player workspace as an
   * editable snapshot ("Copy of ..."), or duplicate a player document. */
  | { type: 'copyItem'; itemId: string }
  | { type: 'createFolder'; name: string }
  | { type: 'moveDocument'; docId: string; folderId?: string }
  | { type: 'renameItem'; itemId: string; name: string }
  /** Delete one of the player's OWN documents (notes/copies). Story items
   * are evidence and can never be deleted. */
  | { type: 'deleteDocument'; docId: string }
  /** Save a microphone recording as a Case Files audio note. */
  | { type: 'saveAudioNote'; name?: string; dataUrl: string }
  | { type: 'deleteAudioNote'; noteId: string }
  | { type: 'resetSeason' };

// ---------------------------------------------------------------------------
// DTOs (server -> client). These must never carry requirements/passwords.
// ---------------------------------------------------------------------------

/** The subset of ItemMeta that is safe to send to the client. */
export type SafeMeta = Omit<ItemMeta, never>; // structurally identical; meta holds no secrets

export interface ItemSummary {
  id: string;
  kind: ItemKind;
  name: string;
  icon?: string;
  parentId?: string;
  meta?: SafeMeta;
  /** True when the item needs a password the player hasn't provided yet. */
  locked?: boolean;
  /** True for player-authored documents (writable in Notepad). */
  editable?: boolean;
}

export interface ItemContent extends ItemSummary {
  body?: ItemBody;
}

export interface DiscoveryView {
  id: string;
  title: string;
  description: string;
}

export interface StateView {
  seasonSlug: string;
  seasonTitle: string;
  clockNow: string;
  owner: string;
  loginUser: string;
  loginHint?: string;
  /** Seconds until the login accepts attempts again (present while frozen). */
  loginLockSeconds?: number;
  saverText?: string;
  imScreenname?: string;
  bootWarning?: string[];
  dosVolume?: { label: string; serial: string };
  /** Dial-up: whether the machine is currently connected. */
  online: boolean;
  /** Seconds the current connection has been up (present while online). */
  onlineSeconds?: number;
  /** True once the line-pickup beat has fired (client shows it one time). */
  linePickup?: boolean;
  /** A remote-access takeover has triggered and not yet been watched: the
   * shell must play it (and replay it after a reload) until acknowledged. */
  remotePending?: boolean;
  wallpaper: string;
  homeUrl: string;
  loggedIn: boolean;
  ended: boolean;
  discoveries: DiscoveryView[];
  /** Items this player has already opened (their own history — safe to send). */
  opened: string[];
}

export interface BuddyView {
  screenname: string;
  alias?: string;
  group: string;
  status: BuddyStatus;
  awayMessage?: string;
  conversationId?: string;
  /** True when a live conversation is currently available with this buddy. */
  canChat?: boolean;
}

/** A prompt the player may say right now. Never carries gates or effects. */
export interface ChatPromptView {
  id: string;
  text: string;
}

export interface ChatView {
  screenname: string;
  alias?: string;
  /** Reconstructed transcript: opener + every exchange so far. */
  messages: ImMessage[];
  /** Prompts currently on offer (already-said ones never reappear). */
  prompts: ChatPromptView[];
  /** The buddy signed off at the end of this exchange. */
  signedOff?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** One Find: Files or Folders hit — a summary plus its "In Folder" path. */
export interface FindHit extends ItemSummary {
  path: string;
}

/** The case handler's memos the player has currently earned. No gates. */
export interface CaseFileView {
  title: string;
  messages: Array<{
    id: string;
    date?: string;
    from?: string;
    subject?: string;
    text: string;
    audioSrc?: string;
  }>;
  /** Present (with the wizard pages) until first-run setup completes. */
  setup?: HandlerSetupPage[];
  /** The same pages, always served — the Help menu's Getting Started. */
  guide?: HandlerSetupPage[];
  /** The Case Summary lines (official background, server-authored). */
  summary?: string[];
  /** The player's recorded audio notes. */
  audioNotes?: PlayerAudioNote[];
}

export type ActionResult = (
  | { type: 'state'; view: StateView }
  | {
      type: 'login';
      ok: boolean;
      lockedOut?: boolean;
      /** Seconds until the account accepts attempts again (when locked). */
      retryAfterSeconds?: number;
      /** The owner's password hint — present only once it has been earned. */
      hint?: string;
      view?: StateView;
    }
  | { type: 'desktop'; items: ItemSummary[] }
  | { type: 'recentDocs'; items: ItemSummary[] }
  | { type: 'children'; items: ItemSummary[] }
  | {
      type: 'open';
      ok: boolean;
      item?: ItemContent;
      lockedHint?: string;
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
      error?: string;
    }
  | {
      type: 'password';
      ok: boolean;
      lockedOut?: boolean;
      remainingAttempts?: number;
    }
  | {
      type: 'visit';
      ok: boolean;
      /** True when the visit failed because the machine is offline. */
      offline?: boolean;
      page?: ItemContent;
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
    }
  | { type: 'search'; results: SearchResult[]; offline?: boolean }
  | { type: 'find'; items: FindHit[] }
  | {
      type: 'dial';
      /** The modem holds the one phone line — no voice call while online. */
      lineBusy?: boolean;
      outcome?: 'busy' | 'no-answer' | 'message';
      message?: string[];
      carrier?: boolean;
    }
  | { type: 'speedDial'; entries: Array<{ label: string; number: string }> }
  | { type: 'buddies'; buddies: BuddyView[] }
  | {
      type: 'chat';
      ok: boolean;
      chat?: ChatView;
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
      error?: string;
    }
  | {
      type: 'document';
      ok: boolean;
      item?: ItemSummary;
      error?: string;
      /** Copying an unread original counts as reading it (copyItem). */
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
    }
  | {
      type: 'remote';
      ok: boolean;
      /** The script to play (getRemoteSession on a pending takeover). */
      script?: RemoteScriptLine[];
      /** Set on remoteSessionDone when watching it earned something. */
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
      error?: string;
    }
  | { type: 'casefile'; view: CaseFileView; offline?: boolean }
  | { type: 'net'; online: boolean; newMail?: number }
  | { type: 'reset'; view: StateView }
  | { type: 'error'; error: string }
) & {
  /**
   * Stamped on the one result during which the line-pickup fired, whatever
   * the action was — the client's cue to refresh and show the scare.
   */
  linePickup?: true;
  /**
   * Wire notices from scheduled events that fired during this action (the
   * machine did something on its own — see WireNotice).
   */
  wire?: WireNotice[];
};

export interface EngineOutcome {
  state: PlayerState;
  changed: boolean;
  result: ActionResult;
  /** Analytics-worthy events produced by this action. */
  events: Array<{ type: string; payload?: Record<string, unknown> }>;
}
