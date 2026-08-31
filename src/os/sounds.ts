/**
 * Tiny synthesized UI sounds (no audio assets). Restrained by design and
 * fully disableable — the mute state persists in localStorage.
 */

import dialupMp3 from '../assets/sounds/dial-up-modem.mp3';
import mailMp3 from '../assets/sounds/mt_youve_got_mail.mp3';
import startupMp3 from '../assets/sounds/mt_microtech-startup-sound.mp3';

import fanSfx from '../assets/sounds/sfx_computer_fan.m4a';
import bootBedSfx from '../assets/sounds/sfx_computer_booting.m4a';
import diskSfx from '../assets/sounds/sfx_computer_reading_bytes.m4a';
import postToneSfx from '../assets/sounds/sfx_boot_tone.m4a';
import beepSfx from '../assets/sounds/sfx_beep.m4a';
import bootLongSfx from '../assets/sounds/sfx_boot_long.m4a';

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

/** The Horizons 95 startup fanfare (system sound — clean, no degradation).
 * Starts with the GUI splash; if the browser blocks autoplay (no gesture
 * yet), the login OK click retries it. Plays once per page load. */
let startupAudio: HTMLAudioElement | null = null;
let startupStarted = false;
let startupPlayed = false;
export function playSystemStartup(cb?: {
  /** The fanfare finished naturally (the splash waits for this). */
  onEnded?: () => void;
  /** No sound will play (muted, blocked, already played) — use a timer. */
  onSilent?: () => void;
}): void {
  if (startupStarted && startupAudio) {
    // Re-entry (StrictMode remount): re-attach to the running fanfare.
    startupAudio.onended = () => cb?.onEnded?.();
    return;
  }
  if (isMuted() || startupPlayed) {
    cb?.onSilent?.();
    return;
  }
  try {
    startupStarted = true;
    const a = new Audio(startupMp3);
    a.volume = 0.4;
    a.onended = () => cb?.onEnded?.();
    startupAudio = a;
    void a.play().then(
      () => {
        startupPlayed = true;
      },
      () => {
        startupStarted = false;
        startupAudio = null;
        cb?.onSilent?.(); // autoplay blocked — a later gesture call retries
      },
    );
  } catch {
    cb?.onSilent?.();
  }
}

/** A skip click cuts the fanfare cleanly, like the modem. */
export function stopSystemStartup(): void {
  startupAudio?.pause();
  startupAudio = null;
}

/**
 * The machine's BODY (owner-approved samples): fan spin-up at the power
 * button, drive chatter under the POST, disk reading under ScanDisk.
 * Quiet, mute-aware, deduped by source so StrictMode remounts don't
 * double them; every boot surface stops them on the way out.
 */
const machineSounds = new Map<string, HTMLAudioElement>();

function playMachine(
  src: string,
  volume: number,
  opts?: { loop?: boolean; onEnded?: () => void },
): void {
  if (isMuted()) return;
  const running = machineSounds.get(src);
  if (running && !running.paused && !running.ended) return;
  try {
    const a = new Audio(src);
    a.volume = volume;
    a.loop = opts?.loop ?? false;
    a.onended = () => {
      machineSounds.delete(src);
      opts?.onEnded?.();
    };
    machineSounds.set(src, a);
    void a.play().catch(() => machineSounds.delete(src));
  } catch {
    /* ignore */
  }
}

function stopMachine(src: string): void {
  const a = machineSounds.get(src);
  if (a) {
    a.pause();
    machineSounds.delete(src);
  }
}

/** The power button: the fan spins up. */
export function playPowerOn(): void {
  playMachine(fanSfx, 0.35);
}

/** The boot bed: one long take of the machine coming up (~24s) carries
 * the whole POST and ScanDisk, cut off when the GUI splash arrives. */
export function playPostSounds(): void {
  playMachine(postToneSfx, 0.3);
  playMachine(bootLongSfx, 0.3);
}

/**
 * The fan hold: a seamless WebAudio loop (HTMLAudio's loop restarts with
 * an audible gap). The loop points sit inside the sample so the edge
 * transients never click.
 */
let fanLoop: AudioBufferSourceNode | null = null;
const loopBuffers = new Map<string, AudioBuffer>();

async function startFanLoop(volume: number): Promise<void> {
  if (isMuted() || fanLoop) return;
  const ac = audio();
  if (!ac) return;
  try {
    let buf = loopBuffers.get(fanSfx);
    if (!buf) {
      const res = await fetch(fanSfx);
      buf = await ac.decodeAudioData(await res.arrayBuffer());
      loopBuffers.set(fanSfx, buf);
    }
    if (fanLoop) return; // a second call raced the fetch
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = 0.25;
    src.loopEnd = Math.max(0.5, buf.duration - 0.25);
    const g = ac.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ac.destination);
    src.start();
    fanLoop = src;
  } catch {
    /* ignore */
  }
}

function stopFanLoop(): void {
  try {
    fanLoop?.stop();
  } catch {
    /* ignore */
  }
  fanLoop = null;
}

/**
 * Entering MS-DOS mode: the BIOS beep, then the boot chatter — and once
 * the machine settles, the fan holds a seamless loop with the disk
 * reading layered over it. stopMachineSounds() on the way out kills it.
 */
export function playDosBoot(): void {
  playMachine(beepSfx, 0.3, {
    onEnded: () =>
      playMachine(bootBedSfx, 0.28, {
        onEnded: () => {
          void startFanLoop(0.12);
          playMachine(diskSfx, 0.18);
        },
      }),
  });
}

/** Program launch: the disk seeks under the flickering pointer. */
export function playLaunchSeek(): void {
  playMachine(diskSfx, 0.16);
}

export function stopLaunchSeek(): void {
  stopMachine(diskSfx);
}

export function stopMachineSounds(): void {
  machineSounds.forEach((a) => a.pause());
  machineSounds.clear();
  stopFanLoop();
}

/** Ease the machine bed out (the login screen arrives, the room goes
 * quiet) — stepped volume drops, then silence. */
export function fadeMachineSounds(ms = 1500): void {
  const steps = 12;
  machineSounds.forEach((a) => {
    const drop = a.volume / steps;
    const t = window.setInterval(() => {
      if (a.volume > drop) a.volume = Math.max(0, a.volume - drop);
      else {
        window.clearInterval(t);
        a.pause();
      }
    }, Math.max(30, ms / steps));
  });
  machineSounds.clear();
  stopFanLoop();
}

/** Mail arrival: the machine's own greeting sample (owner-approved
 * exception #3), played QUIET — it punctuates, never startles. The chip
 * chirp is the fallback if playback is blocked. */
export function playMailSound(): void {
  if (isMuted()) return;
  try {
    const a = new Audio(mailMp3);
    a.volume = 0.22;
    void a.play().catch(() => playNotify());
  } catch {
    playNotify();
  }
}

export function playError(): void {
  tone(196, 0, 160, 'sawtooth', 0.03);
}

/** Real DTMF pairs — a touch-tone keypad is two sine waves, not a beep. */
const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export function playDtmf(key: string, startMs = 0): void {
  const pair = DTMF[key];
  if (!pair) return;
  tone(pair[0], startMs, 90, 'sine', 0.03);
  tone(pair[1], startMs, 90, 'sine', 0.03);
}

/** One US ring cadence burst (440+480 Hz). */
export function playRing(startMs = 0): void {
  tone(440, startMs, 1400, 'sine', 0.025);
  tone(480, startMs, 1400, 'sine', 0.025);
}

/**
 * The real thing: a sampled dial-up handshake (owner-approved exception to
 * the synth-only rule — nostalgia is the point). Stopped cleanly when the
 * connection completes or the player skips; the chip-tone cartoon below is
 * the fallback if playback is blocked.
 */
let dialupAudio: HTMLAudioElement | null = null;

export function startDialupSound(): void {
  if (isMuted()) return;
  try {
    stopDialupSound();
    const a = new Audio(dialupMp3);
    a.volume = 0.45;
    dialupAudio = a;
    void a.play().catch(() => {
      dialupAudio = null;
      playDialup();
    });
  } catch {
    playDialup();
  }
}

export function stopDialupSound(): void {
  if (dialupAudio) {
    dialupAudio.pause();
    dialupAudio = null;
  }
}

/**
 * A stylized chip-tone handshake — the fallback when sampled audio can't
 * play (autoplay policy, missing file).
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

/** The busy signal: the classic 480+620 Hz cadence, three beats. */
export function playBusy(): void {
  for (let i = 0; i < 3; i++) {
    tone(480, i * 500, 240, 'sine', 0.02);
    tone(620, i * 500, 240, 'sine', 0.02);
  }
}

/** A buddy signing on: two rising notes, the era's doorbell. */
export function playBuddyOn(): void {
  tone(523, 0, 120, 'square', 0.03);
  tone(784, 130, 200, 'square', 0.025);
}

/** A buddy signing off: the doorbell in reverse. */
export function playBuddyOff(): void {
  tone(784, 0, 120, 'square', 0.025);
  tone(523, 130, 200, 'square', 0.03);
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
