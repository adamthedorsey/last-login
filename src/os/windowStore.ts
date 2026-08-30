import { create } from 'zustand';
import { getApp } from './appRegistry';

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  icon: string;
  props: Record<string, unknown>;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** false = fixed-size Win95 dialog (no handles, no maximize). */
  resizable: boolean;
}

interface LaunchOpts {
  props?: Record<string, unknown>;
  title?: string;
}

interface WindowStore {
  windows: OSWindow[];
  nextZ: number;
  /** A launch waiting on its app's startup splash (see AppDefinition.splash). */
  pendingLaunch: { appId: string; opts?: LaunchOpts } | null;
  open(appId: string, opts?: LaunchOpts): void;
  completeLaunch(): void;
  close(id: string): void;
  closeAll(): void;
  focus(id: string): void;
  minimize(id: string): void;
  toggleMaximize(id: string): void;
  move(id: string, x: number, y: number): void;
  setRect(id: string, rect: { x: number; y: number; w: number; h: number }): void;
  setTitle(id: string, title: string): void;
  /** Taskbar-menu window arrangement, straight out of Win95. */
  cascade(): void;
  tile(direction: 'horizontal' | 'vertical'): void;
  minimizeAll(): void;
}

let idCounter = 0;

export const TASKBAR_HEIGHT = 40;

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  nextZ: 10,
  pendingLaunch: null,

  open(appId, opts) {
    const def = getApp(appId);
    if (!def) return;
    const { windows, nextZ, pendingLaunch } = get();

    // Fresh launch of an app with a startup splash: show the splash first,
    // open the window when it finishes. Refocusing an existing singleton
    // window (or re-targeting it with new props) skips the splash.
    const existing = def.singleton ? windows.find((w) => w.appId === appId) : undefined;
    if (def.splash && !existing && !opts?.props?.skipSplash) {
      set({
        pendingLaunch: {
          appId,
          opts:
            pendingLaunch?.appId === appId
              ? {
                  ...pendingLaunch.opts,
                  ...opts,
                  props: { ...pendingLaunch.opts?.props, ...opts?.props },
                }
              : opts,
        },
      });
      return;
    }

    if (def.singleton) {
      const existing = windows.find((w) => w.appId === appId);
      if (existing) {
        set({
          nextZ: nextZ + 1,
          windows: windows.map((w) =>
            w.id === existing.id
              ? {
                  ...w,
                  minimized: false,
                  z: nextZ + 1,
                  props: { ...w.props, ...(opts?.props ?? {}) },
                  title: opts?.title ?? w.title,
                }
              : w,
          ),
        });
        return;
      }
    }

    const cascade = (windows.length % 8) * 26;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_HEIGHT;
    const w = Math.min(def.defaultSize.w, vw - 24);
    const h = Math.min(def.defaultSize.h, vh - 24);
    const win: OSWindow = {
      id: `win-${++idCounter}`,
      appId,
      title: opts?.title ?? def.name,
      icon: def.icon,
      props: opts?.props ?? {},
      // Wizards and fixed dialogs open dead center; everything else cascades.
      x: def.center
        ? Math.max(8, Math.round((vw - w) / 2))
        : Math.max(8, Math.min(80 + cascade, vw - w - 8)),
      y: def.center
        ? Math.max(8, Math.round((vh - h) / 2))
        : Math.max(8, Math.min(48 + cascade, vh - h - 8)),
      w,
      h,
      z: nextZ + 1,
      minimized: false,
      maximized: false,
      resizable: def.resizable !== false,
    };
    set({ windows: [...get().windows, win], nextZ: get().nextZ + 1 });
  },

  completeLaunch() {
    const { pendingLaunch } = get();
    if (!pendingLaunch) return;
    set({ pendingLaunch: null });
    get().open(pendingLaunch.appId, {
      ...pendingLaunch.opts,
      props: { ...pendingLaunch.opts?.props, skipSplash: true },
    });
  },

  close(id) {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
  },

  closeAll() {
    set({ windows: [] });
  },

  focus(id) {
    set((s) => ({
      nextZ: s.nextZ + 1,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: false, z: s.nextZ + 1 } : w,
      ),
    }));
  },

  minimize(id) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    }));
  },

  toggleMaximize(id) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)),
    }));
  },

  move(id, x, y) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  },

  setRect(id, rect) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)),
    }));
  },

  setTitle(id, title) {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)),
    }));
  },

  cascade() {
    set((s) => {
      const order = s.windows
        .filter((w) => !w.minimized)
        .sort((a, b) => a.z - b.z)
        .map((w) => w.id);
      return {
        windows: s.windows.map((w) => {
          const i = order.indexOf(w.id);
          if (i < 0) return w;
          const offset = (i % 8) * 26;
          return { ...w, maximized: false, x: 8 + offset, y: 8 + offset };
        }),
      };
    });
  },

  tile(direction) {
    set((s) => {
      const open = s.windows.filter((w) => !w.minimized).sort((a, b) => a.z - b.z);
      if (open.length === 0) return {};
      const vw = window.innerWidth;
      const vh = window.innerHeight - TASKBAR_HEIGHT;
      const n = open.length;
      const rects = open.map((w, i) =>
        direction === 'horizontal'
          ? { id: w.id, x: 0, y: Math.round((vh / n) * i), w: vw, h: Math.floor(vh / n) }
          : { id: w.id, x: Math.round((vw / n) * i), y: 0, w: Math.floor(vw / n), h: vh },
      );
      return {
        windows: s.windows.map((w) => {
          const r = rects.find((t) => t.id === w.id);
          return r ? { ...w, maximized: false, x: r.x, y: r.y, w: r.w, h: r.h } : w;
        }),
      };
    });
  },

  minimizeAll() {
    set((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })) }));
  },
}));

export function topWindowId(windows: OSWindow[]): string | null {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return null;
  return visible.reduce((a, b) => (a.z > b.z ? a : b)).id;
}
