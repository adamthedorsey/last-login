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

/** Icon cell footprint used to decide what "fully visible" means. */
const CELL_W = 90;
const CELL_H = 92;
const TASKBAR = 40;

/**
 * Resolve an authored desktop slot to master-grid pixels. Absolute slots
 * pass through; anchored slots ('bottom-right', 'center') are grid-slot
 * offsets resolved against the current viewport — and always land ON the
 * master grid, so Line Up Icons and drag-snapping agree with them.
 */
export function resolveDesktopSlot(
  d: { x: number; y: number; anchor?: 'bottom-right' | 'center' },
  vw = window.innerWidth,
  vh = window.innerHeight,
): { x: number; y: number } {
  if (!d.anchor) return { x: d.x, y: d.y };
  const cols = Math.max(1, Math.floor((vw - ORIGIN - CELL_W) / GRID) + 1);
  const rows = Math.max(1, Math.floor((vh - TASKBAR - ORIGIN - CELL_H) / GRID) + 1);
  let col: number;
  let row: number;
  if (d.anchor === 'bottom-right') {
    col = cols - 1 - d.x;
    row = rows - 1 - d.y;
  } else {
    col = Math.floor((cols - 1) / 2) + d.x;
    row = Math.floor((rows - 1) / 2) + d.y;
  }
  return {
    x: ORIGIN + Math.max(0, Math.min(cols - 1, col)) * GRID,
    y: ORIGIN + Math.max(0, Math.min(rows - 1, row)) * GRID,
  };
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
