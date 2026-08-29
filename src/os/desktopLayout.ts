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

export function saveLayout(layout: Layout): void {
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
