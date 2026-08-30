/** Desktop icon layout — per-device cosmetic state, shared by the desktop and Explorer drag-out. */

export const GRID = 96;
export const ORIGIN = 24;
const LAYOUT_KEY = 'lastlogin.desktopLayout';

export type Layout = Record<string, { x: number; y: number }>;

export function loadLayout(): Layout {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Layout;
  } catch {
    return {};
  }
}

export function saveLayout(layout: Layout, opts?: { allowEmpty?: boolean }): void {
  // A full wipe is only ever legitimate from "Line Up Icons" (which passes
  // allowEmpty). Any other caller asking to save an empty layout over a
  // non-empty one is a bug — keep what's on disk and shout in dev.
  if (Object.keys(layout).length === 0 && !opts?.allowEmpty) {
    if (Object.keys(loadLayout()).length === 0) return; // nothing to lose
    if (import.meta.env.DEV) {
      console.warn('saveLayout: refused empty layout write', new Error().stack);
    }
    return;
  }
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

/** Win95 "Line Up Icons": snap to the invisible desktop grid. */
export function snapToGrid(v: number): number {
  return ORIGIN + Math.round((v - ORIGIN) / GRID) * GRID;
}

/** Record a single icon position (used when dropping a file onto the desktop). */
export function placeIcon(id: string, x: number, y: number): void {
  const layout = loadLayout();
  layout[id] = { x, y };
  saveLayout(layout);
}
