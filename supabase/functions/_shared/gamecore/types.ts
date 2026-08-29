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
  | 'trash_item';

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
  // recycle bin
  deletedAt?: string;
  originalPath?: string;
  // desktop placement
  desktop?: { x: number; y: number };
  // shortcuts
  appId?: string;
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
}

export interface Discovery {
  id: string;
  title: string;
  description: string;
  endsDemo?: boolean;
}

export type BuddyStatus = 'online' | 'offline' | 'away';

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

export interface ChatConversation {
  /** The buddy this conversation belongs to (must match a roster entry). */
  screenname: string;
  /** When live chat with this buddy is available at all. SERVER ONLY. */
  requires?: Requirement;
  /** Lines the buddy sends when the window first opens. */
  opener: string[];
  /** Every prompt is one-shot: once said, it never re-offers. */
  prompts: ChatPrompt[];
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
    loginHint?: string;
    /** The word the owner set in their screen saver. Sometimes a clue. */
    saverText?: string;
    /** The owner's instant-messenger screen name (the player chats as it). */
    imScreenname?: string;
  };
  /** Standalone password targets (e.g. the OS login itself). SERVER ONLY values. */
  passwords: Record<string, { password: string; hint?: string }>;
  wallpaper: string;
  homeUrl: string;
  items: ContentItem[];
  discoveries: Discovery[];
  buddies: Buddy[];
  /** Live prompt-tree conversations (see ChatConversation). SERVER ONLY. */
  conversations?: ChatConversation[];
  maxPasswordAttempts: number;
  lockoutSeconds: number;
}

// ---------------------------------------------------------------------------
// Player state (persisted server-side, per player per season)
// ---------------------------------------------------------------------------

/** A document the PLAYER wrote (via Notepad) — their own notes, saved to the desktop. */
export interface PlayerDocument {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  modifiedAt: string;
  /** When set, the doc lives inside a player folder instead of on the desktop. */
  folderId?: string;
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
  docSeq?: number;
  folders?: PlayerFolder[];
  folderSeq?: number;
  /** Per-buddy list of prompt ids the player has said, in order. */
  chats?: Record<string, string[]>;
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
  | { type: 'getDesktop' }
  | { type: 'listChildren'; parentId: string }
  | { type: 'open'; itemId: string }
  | { type: 'attemptPassword'; targetId: string; password: string }
  | { type: 'visit'; url: string }
  | { type: 'search'; query: string }
  | { type: 'getBuddies' }
  | { type: 'getConversation'; screenname: string }
  | { type: 'say'; screenname: string; promptId: string }
  | { type: 'saveDocument'; docId?: string; name: string; text: string }
  | { type: 'createFolder'; name: string }
  | { type: 'moveDocument'; docId: string; folderId?: string }
  | { type: 'renameItem'; itemId: string; name: string }
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
  saverText?: string;
  imScreenname?: string;
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

export type ActionResult =
  | { type: 'state'; view: StateView }
  | { type: 'login'; ok: boolean; lockedOut?: boolean; view?: StateView }
  | { type: 'desktop'; items: ItemSummary[] }
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
      page?: ItemContent;
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
    }
  | { type: 'search'; results: SearchResult[] }
  | { type: 'buddies'; buddies: BuddyView[] }
  | {
      type: 'chat';
      ok: boolean;
      chat?: ChatView;
      newDiscoveries?: DiscoveryView[];
      ended?: boolean;
      error?: string;
    }
  | { type: 'document'; ok: boolean; item?: ItemSummary; error?: string }
  | { type: 'reset'; view: StateView }
  | { type: 'error'; error: string };

export interface EngineOutcome {
  state: PlayerState;
  changed: boolean;
  result: ActionResult;
  /** Analytics-worthy events produced by this action. */
  events: Array<{ type: string; payload?: Record<string, unknown> }>;
}
