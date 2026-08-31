/**
 * Per-device Messenger conveniences — the player's own away message and
 * any buddies they add. Cosmetic localStorage state, exactly like the
 * desktop layout: it never touches the engine, carries no story, and the
 * server-authored roster is untouched. Player-added buddies render as
 * plain offline entries (there is no live network behind them).
 */
const AWAY_KEY = 'lastlogin.messenger.away';
const BUDDIES_KEY = 'lastlogin.messenger.buddies';

export interface LocalBuddy {
  screenname: string;
  group: string;
}

export const DEFAULT_AWAY = 'I am away from my computer right now.';

export function loadAway(): string | null {
  try {
    return localStorage.getItem(AWAY_KEY);
  } catch {
    return null;
  }
}

export function saveAway(msg: string | null): void {
  try {
    if (msg) localStorage.setItem(AWAY_KEY, msg);
    else localStorage.removeItem(AWAY_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLocalBuddies(): LocalBuddy[] {
  try {
    const raw = localStorage.getItem(BUDDIES_KEY);
    return raw ? (JSON.parse(raw) as LocalBuddy[]) : [];
  } catch {
    return [];
  }
}

function saveLocalBuddies(list: LocalBuddy[]): void {
  try {
    localStorage.setItem(BUDDIES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function addLocalBuddy(b: LocalBuddy): LocalBuddy[] {
  const list = loadLocalBuddies();
  if (!list.some((x) => x.screenname.toLowerCase() === b.screenname.toLowerCase())) {
    list.push(b);
    saveLocalBuddies(list);
  }
  return list;
}

export function removeLocalBuddy(screenname: string): LocalBuddy[] {
  const list = loadLocalBuddies().filter(
    (x) => x.screenname.toLowerCase() !== screenname.toLowerCase(),
  );
  saveLocalBuddies(list);
  return list;
}
