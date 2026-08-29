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

/**
 * A stylized dial-up handshake, all chip tones (~3.2s, quiet): dial tone,
 * DTMF chatter, carrier warble, then the answering screech. Not a sample —
 * a cartoon of the real thing, per the synth-only sound rule.
 */
export function playDialup(): void {
  // dial tone
  tone(350, 0, 350, 'sine', 0.02);
  tone(440, 0, 350, 'sine', 0.02);
  // DTMF-ish digit chatter
  const digits = [
    [770, 1336], [852, 1209], [852, 1477], [697, 1336], [941, 1336], [770, 1209], [852, 1336],
  ];
  digits.forEach(([a, b], i) => {
    tone(a, 420 + i * 90, 70, 'sine', 0.02);
    tone(b, 420 + i * 90, 70, 'sine', 0.02);
  });
  // ring, then the modem answers
  tone(440, 1150, 300, 'sine', 0.02);
  // carrier warble: alternating originate/answer tones
  for (let i = 0; i < 6; i++) {
    tone(i % 2 ? 1200 : 2250, 1550 + i * 130, 110, 'square', 0.012);
  }
  // negotiation screech: fast pseudo-random chirps
  const chirps = [1830, 990, 2110, 1370, 2510, 760, 1650, 2010, 1150, 2390];
  chirps.forEach((f, i) => {
    tone(f, 2350 + i * 55, 45, 'sawtooth', 0.008);
  });
  // settled carrier hum
  tone(1070, 2950, 260, 'sine', 0.012);
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
