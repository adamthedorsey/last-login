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
  // The ambient machine voice reacts immediately: muting kills the hum,
  // unmuting brings it back if a surface still wants it.
  if (muted) killFanHum();
  else if (humWanted) startFanHum();
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
    // Re-entry (StrictMode remount): re-attach to the running fanfare —
    // unless it already finished, in which case waiting would hang.
    if (startupAudio.ended) {
      cb?.onEnded?.();
      return;
    }
    startupAudio.onended = () => cb?.onEnded?.();
    startupAudio.onerror = () => cb?.onSilent?.();
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
    a.onerror = () => {
      // The file failed mid-load or mid-play: release the splash.
      startupStarted = false;
      startupAudio = null;
      cb?.onSilent?.();
    };
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
 * Entering MT-DOS mode: the BIOS beep, then the boot chatter — and once
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

export function stopMachineSounds(): void {
  machineSounds.forEach((a) => a.pause());
  machineSounds.clear();
  stopFanLoop();
  killFanHum();
  humWanted = false;
}

// ---------------------------------------------------------------------------
// The machine's voice, SYNTHESIZED (no samples, no noise floor): a constant
// low fan hum while the desktop is up, a spin-up surge when the machine
// works (bigger program = more fan), and hard-disk seek chatter — rapid
// irregular clicking — under launches and long thinks. All WebAudio, so the
// hum loops seamlessly and every chatter burst is different.
// ---------------------------------------------------------------------------

/** One shared 2s white-noise buffer: the fan's air AND the disk's clicks. */
let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// --- The fan: filtered air noise + a faint motor fundamental -------------
const FAN_BASE_GAIN = 0.008;
const FAN_BASE_HZ = 240;
// A second, fixed lowpass keeps the air DARK even when the surge opens the
// first filter — brightness is what reads as synthetic.
const FAN_CAP_HZ = 600;
const MOTOR_HZ = 118;
// Nearly subliminal — the hum should read as AIR, the tone only felt.
const MOTOR_GAIN = 0.0008;

interface FanHum {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  motor: OscillatorNode;
  motorGain: GainNode;
}
let hum: FanHum | null = null;
/** A surface asked for the hum (survives a mute/unmute round trip). */
let humWanted = false;
// The idle disk EPISODES: the disk is silent by default — but every so
// often, while the machine sits there, it wakes for a short unprompted
// burst of housekeeping (a second or two of chatter), then goes quiet
// again. Scheduled alongside the hum, torn down with it.
let idleDiskTimer: number | null = null;
let idleEpisodeId: number | null = null;
let idleEpisodeStop: number | null = null;

function scheduleIdleDisk(): void {
  idleDiskTimer = window.setTimeout(() => {
    idleEpisodeId = startDiskChatter(0.35 + Math.random() * 0.3);
    idleEpisodeStop = window.setTimeout(() => {
      if (idleEpisodeId !== null) stopDiskChatter(idleEpisodeId);
      idleEpisodeId = null;
      idleEpisodeStop = null;
    }, 800 + Math.random() * 1700);
    scheduleIdleDisk();
  }, 15_000 + Math.random() * 35_000);
}

function stopIdleDisk(): void {
  if (idleDiskTimer !== null) window.clearTimeout(idleDiskTimer);
  if (idleEpisodeStop !== null) window.clearTimeout(idleEpisodeStop);
  if (idleEpisodeId !== null) stopDiskChatter(idleEpisodeId);
  idleDiskTimer = null;
  idleEpisodeStop = null;
  idleEpisodeId = null;
}

export function startFanHum(): void {
  humWanted = true;
  if (isMuted() || hum) return;
  const ac = audio();
  if (!ac) return;
  try {
    const src = ac.createBufferSource();
    src.buffer = noise(ac);
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = FAN_BASE_HZ;
    filter.Q.value = 0.4;
    const cap = ac.createBiquadFilter();
    cap.type = 'lowpass';
    cap.frequency.value = FAN_CAP_HZ;
    cap.Q.value = 0.3;
    const gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(cap).connect(gain).connect(ac.destination);
    const motor = ac.createOscillator();
    motor.type = 'triangle';
    motor.frequency.value = MOTOR_HZ;
    const motorGain = ac.createGain();
    motorGain.gain.value = 0;
    motor.connect(motorGain).connect(ac.destination);
    src.start();
    motor.start();
    // Settle in over a beat rather than snapping on.
    gain.gain.setTargetAtTime(FAN_BASE_GAIN, ac.currentTime, 0.4);
    motorGain.gain.setTargetAtTime(MOTOR_GAIN, ac.currentTime, 0.4);
    hum = { src, filter, gain, motor, motorGain };
    applyFanLevel();
    // The disk sits SILENT at idle — but wakes now and then for a short
    // unprompted housekeeping burst (the ambient life of an old PC).
    if (idleDiskTimer === null) scheduleIdleDisk();
  } catch {
    /* ignore */
  }
}

/** Tear the nodes down without clearing the "wanted" flag (mute path). */
function killFanHum(): void {
  stopIdleDisk();
  if (!hum) return;
  try {
    hum.src.stop();
    hum.motor.stop();
  } catch {
    /* ignore */
  }
  hum = null;
}

export function stopFanHum(): void {
  humWanted = false;
  killFanHum();
}

// --- The spin-up: work makes the fan louder, brighter, slightly faster ---
let surgeSeq = 0;
const surges = new Map<number, number>();

function applyFanLevel(): void {
  if (!hum || !ctx) return;
  let level = 0;
  surges.forEach((v) => {
    if (v > level) level = v;
  });
  // A fan spinning up is just MORE AIR: a slow swell of the same dark
  // noise — no brightening, no pitch shift, the motor tone untouched
  // (any tonal movement reads as an engine revving). The fixed cap
  // filter keeps the character identical at every level.
  const tc = level > 0 ? 0.45 : 0.6;
  const t = ctx.currentTime;
  hum.filter.frequency.setTargetAtTime(FAN_BASE_HZ + 180 * level, t, tc);
  hum.gain.gain.setTargetAtTime(FAN_BASE_GAIN * (1 + 1.3 * level), t, tc);
}

/** Start a spin-up at the given intensity (0..1). Returns a handle. */
export function beginFanSurge(intensity: number): number {
  const id = ++surgeSeq;
  surges.set(id, Math.max(0, Math.min(1, intensity)));
  applyFanLevel();
  return id;
}

export function endFanSurge(id: number): void {
  surges.delete(id);
  applyFanLevel();
}

// --- The hard disk: irregular clusters of tiny clicks --------------------
// Chatter is VARIABLE: how hard the machine is thinking sets the density.
// Thinking hard = long busy click runs with short settles; a light read =
// a few clicks, then a long spaced-out pause before the heads move again.
let chatterSeq = 0;
const chatters = new Map<number, number>();
let chatterTimer: number | null = null;

function chatterLevel(): number {
  let level = 0;
  chatters.forEach((v) => {
    if (v > level) level = v;
  });
  return level;
}

function diskClick(ac: AudioContext, at: number): void {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200 + Math.random() * 2400;
  bp.Q.value = 2.5;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0114 + Math.random() * 0.0171, at);
  g.gain.exponentialRampToValueAtTime(0.0006, at + 0.012);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(at, Math.random() * 1.5, 0.004 + Math.random() * 0.004);
}

function chatterBurst(): void {
  if (chatters.size === 0) {
    chatterTimer = null;
    return;
  }
  const level = chatterLevel();
  const ac = ctx;
  if (ac && !isMuted()) {
    // One seek: a cluster of clicks. Hard thinking = long runs of tight
    // clicks; light work = a couple of ticks.
    const clicks = 2 + Math.floor((3 + Math.random() * 11) * level);
    let at = ac.currentTime + 0.01;
    for (let i = 0; i < clicks; i++) {
      diskClick(ac, at);
      at += 0.008 + Math.random() * (0.014 + 0.02 * (1 - level));
    }
  }
  // Heads settle before the next seek — brief under load, stretching to
  // multi-second lazy gaps at idle (quadratic, so busy stays tight).
  const idle = (1 - level) * (1 - level);
  const pause = 60 + Math.random() * 140 + idle * (1500 + Math.random() * 3500);
  chatterTimer = window.setTimeout(chatterBurst, pause);
}

/** The disk starts reading at the given think-hardness (0..1). Returns a
 * handle for stopDiskChatter. Overlapping readers stack; density follows
 * the busiest one. */
export function startDiskChatter(intensity = 0.6): number {
  const id = ++chatterSeq;
  chatters.set(id, Math.max(0.1, Math.min(1, intensity)));
  if (chatterTimer === null && audio()) chatterBurst();
  return id;
}

export function stopDiskChatter(id: number): void {
  chatters.delete(id);
  if (chatters.size === 0 && chatterTimer !== null) {
    window.clearTimeout(chatterTimer);
    chatterTimer = null;
  }
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
