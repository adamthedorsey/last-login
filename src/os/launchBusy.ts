/**
 * Program-launch cursor theater: from the double-click until the window
 * appears, the pointer flickers between busy, half-busy and idle on an
 * uneven clock — the same tell as the boot flicker (bootCursor.ts), on a
 * faster schedule. Launches also take TIME, like a disk actually seeking:
 * the first launch of a program is slow, a warm relaunch is quicker.
 *
 * Under the flicker the MACHINE works: the hard disk chatters (synthesized
 * click clusters) and the fan surges — a big program on a cold launch spins
 * it up hard, a small accessory barely stirs it (sounds.ts).
 */

import { beginFanSurge, endFanSurge, startDiskChatter, stopDiskChatter } from './sounds';

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
const surgeIds: number[] = [];
const chatterIds: number[] = [];

function tick() {
  const [cursor, hold] = SCHEDULE[idx % SCHEDULE.length];
  document.documentElement.style.setProperty('--cursor-launch', cursor);
  idx += 1;
  timer = window.setTimeout(tick, hold);
}

export function beginLaunchBusy(intensity = 0.4): void {
  pending += 1;
  surgeIds.push(beginFanSurge(intensity));
  // The disk seeks under the flickering pointer — as hard as the fan works.
  chatterIds.push(startDiskChatter(intensity));
  if (pending > 1) return;
  idx = 0;
  document.documentElement.classList.add('launching');
  tick();
}

export function endLaunchBusy(): void {
  pending = Math.max(0, pending - 1);
  const id = surgeIds.pop();
  if (id !== undefined) endFanSurge(id);
  const cid = chatterIds.pop();
  // The disk settles AFTER the window lands — caching, the way real
  // drives kept muttering — then goes quiet 1-2 seconds later.
  if (cid !== undefined) {
    window.setTimeout(() => stopDiskChatter(cid), 700 + Math.random() * 600);
  }
  if (pending > 0) return;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  document.documentElement.classList.remove('launching');
  document.documentElement.style.removeProperty('--cursor-launch');
}

/** Cold launches seek the disk; warm relaunches come out of cache. */
const warm = new Set<string>();

/**
 * How this launch behaves: the delay the window takes to appear, and how
 * hard the machine works for it. `sizeWeight` (0..1) is the program's
 * footprint — windowStore derives it from the app's window area, the
 * closest thing the shell has to an executable size.
 */
export function launchProfile(appId: string, sizeWeight: number): { ms: number; intensity: number } {
  const cold = !warm.has(appId);
  warm.add(appId);
  return cold
    ? { ms: 950 + Math.floor(Math.random() * 450), intensity: 0.45 + 0.55 * sizeWeight }
    : { ms: 450 + Math.floor(Math.random() * 250), intensity: 0.12 + 0.28 * sizeWeight };
}
