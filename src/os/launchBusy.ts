/**
 * Program-launch cursor theater: from the double-click until the window
 * appears, the pointer flickers between busy, half-busy and idle on an
 * uneven clock — the same tell as the boot flicker (bootCursor.ts), on a
 * faster schedule. Launches also take TIME, like a disk actually seeking:
 * the first launch of a program is slow, a warm relaunch is quicker.
 */

const SCHEDULE: Array<[cursor: string, holdMs: number]> = [
  ['var(--cursor-appstarting)', 420],
  ['var(--cursor-wait)', 380],
  ['var(--cursor-appstarting)', 300],
  ['var(--cursor-arrow)', 140],
  ['var(--cursor-wait)', 460],
  ['var(--cursor-appstarting)', 340],
];

let pending = 0;
let timer: number | null = null;
let idx = 0;

function tick() {
  const [cursor, hold] = SCHEDULE[idx % SCHEDULE.length];
  document.documentElement.style.setProperty('--cursor-launch', cursor);
  idx += 1;
  timer = window.setTimeout(tick, hold);
}

export function beginLaunchBusy(): void {
  pending += 1;
  if (pending > 1) return;
  idx = 0;
  document.documentElement.classList.add('launching');
  tick();
}

export function endLaunchBusy(): void {
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  document.documentElement.classList.remove('launching');
  document.documentElement.style.removeProperty('--cursor-launch');
}

/** Cold launches seek the disk; warm relaunches come out of cache. */
const warm = new Set<string>();

export function launchDelayMs(appId: string): number {
  if (warm.has(appId)) return 450 + Math.floor(Math.random() * 250);
  warm.add(appId);
  return 950 + Math.floor(Math.random() * 450);
}
