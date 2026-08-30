import type { ComponentType } from 'react';

export interface AppWindowProps {
  windowId: string;
  props: Record<string, unknown>;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  component: ComponentType<AppWindowProps>;
  defaultSize: { w: number; h: number };
  singleton?: boolean;
  /** Hide from the Start menu (utility windows). */
  hidden?: boolean;
  /** Open centered on the screen (wizards, fixed dialogs). */
  center?: boolean;
  /** false = fixed-size, Win95-dialog style: no resize handles, no
   * maximize. Defaults to true. */
  resizable?: boolean;
  /**
   * Startup splash shown BEFORE the window opens (a fresh launch only —
   * refocusing an existing singleton window skips it). Call onDone to
   * proceed; clicking through should also work.
   */
  splash?: ComponentType<{ onDone: () => void }>;
}

const registry = new Map<string, AppDefinition>();

export function registerApp(def: AppDefinition): void {
  registry.set(def.id, def);
}

export function getApp(id: string): AppDefinition | undefined {
  return registry.get(id);
}

export function listApps(): AppDefinition[] {
  return [...registry.values()].filter((a) => !a.hidden);
}
