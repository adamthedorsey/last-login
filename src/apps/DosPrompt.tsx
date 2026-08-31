/**
 * MT-DOS Prompt — COMMAND in a window, exactly like the real thing ran
 * it. The terminal itself lives in src/os/DosMode.tsx (engine-backed, so
 * content gating carries over); this shell just mounts it windowed:
 * keyboard only while the window is focused, `exit` closes the window.
 */
import { DosTerminal } from '../os/DosMode';
import { topWindowId, useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

export function DosPrompt({ windowId }: AppWindowProps) {
  const close = useWindowStore((s) => s.close);
  const focused = useWindowStore((s) => topWindowId(s.windows) === windowId);
  return <DosTerminal windowed active={focused} onExit={() => close(windowId)} />;
}
