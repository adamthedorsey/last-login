/**
 * Tiny synthesized UI sounds (no audio assets). Restrained by design and
 * fully disableable — the mute state persists in localStorage.
 */

const MUTE_KEY = 'lastlogin.muted';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function tone(freq: number, startMs: number, durMs: number, type: OscillatorType = 'square', gain = 0.03) {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const t0 = ac.currentTime + startMs / 1000;
  const t1 = t0 + durMs / 1000;
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

/** Very small two-note chirp for quiet system feedback. */
export function playNotify(): void {
  tone(660, 0, 90, 'square', 0.025);
  tone(880, 100, 130, 'square', 0.02);
}

export function playError(): void {
  tone(196, 0, 160, 'sawtooth', 0.03);
}

/** A buddy signing on: two rising notes, the era's doorbell. */
export function playBuddyOn(): void {
  tone(523, 0, 120, 'square', 0.03);
  tone(784, 130, 200, 'square', 0.025);
}

/** One incoming instant-message blip. Quiet — it can fire in a row. */
export function playImMsg(): void {
  tone(740, 0, 70, 'square', 0.018);
}

export function playStartup(): void {
  tone(392, 0, 180, 'triangle', 0.035);
  tone(523, 160, 180, 'triangle', 0.035);
  tone(659, 320, 320, 'triangle', 0.03);
}
