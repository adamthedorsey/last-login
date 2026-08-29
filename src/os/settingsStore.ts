/**
 * Machine settings the player can change via Display Properties.
 * Per-device cosmetics — persisted in localStorage, like the icon layout.
 */
import { create } from 'zustand';

const KEY = 'lastlogin.settings';

export const WALLPAPERS: Array<{ name: string; color: string }> = [
  { name: 'Horizons Teal', color: '#008080' },
  { name: 'Bubblegum', color: '#c76c9e' },
  { name: 'Slate', color: '#5f6f7a' },
  { name: 'Midnight', color: '#1a1a4e' },
  { name: 'Forest', color: '#2a6b3a' },
  { name: 'Plum', color: '#5a2a6a' },
  { name: 'Desert', color: '#a88a5a' },
];

interface Persisted {
  wallpaper: string;
  saverMinutes: number;
}

function load(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Persisted>;
    return {
      wallpaper: typeof raw.wallpaper === 'string' ? raw.wallpaper : '#008080',
      saverMinutes: typeof raw.saverMinutes === 'number' ? raw.saverMinutes : 3,
    };
  } catch {
    return { wallpaper: '#008080', saverMinutes: 3 };
  }
}

interface SettingsStore extends Persisted {
  /** Bumps when something asks the shell to start the screen saver now. */
  saverNonce: number;
  setWallpaper(color: string): void;
  setSaverMinutes(min: number): void;
  previewSaver(): void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  saverNonce: 0,
  setWallpaper(wallpaper) {
    set({ wallpaper });
    persist(get());
  },
  setSaverMinutes(saverMinutes) {
    set({ saverMinutes: Math.max(1, Math.min(10, saverMinutes)) });
    persist(get());
  },
  previewSaver() {
    set((s) => ({ saverNonce: s.saverNonce + 1 }));
  },
}));

function persist(s: SettingsStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ wallpaper: s.wallpaper, saverMinutes: s.saverMinutes }));
  } catch {
    /* ignore */
  }
}
