/**
 * Warm the browser cache for the machine's TIMED media — the sounds and
 * images that play against a clock (the POST tone under the boot, the disk
 * seek under a launch, the splash art) and would otherwise first-load from
 * the network at the exact moment they're needed. Everything here ships as
 * a hashed immutable asset, so one warm fetch makes every later lazy
 * `new Audio(src)` / <img> hit disk cache instantly.
 *
 * Fetches run sequentially, smallest/most-timing-critical first, so the
 * sounds the player hears in the first minute are warm within moments of
 * app load. Failures are ignored — the lazy paths still work, just cold.
 */
import postToneSfx from '../assets/sounds/sfx_boot_tone.m4a';
import beepSfx from '../assets/sounds/sfx_beep.m4a';
import diskSfx from '../assets/sounds/sfx_computer_reading_bytes.m4a';
import bootBedSfx from '../assets/sounds/sfx_computer_booting.m4a';
import fanSfx from '../assets/sounds/sfx_computer_fan.m4a';
import bootLongSfx from '../assets/sounds/sfx_boot_long.m4a';
import mailMp3 from '../assets/sounds/mt_youve_got_mail.mp3';
import startupMp3 from '../assets/sounds/mt_microtech-startup-sound.mp3';
import dialupMp3 from '../assets/sounds/dial-up-modem.mp3';
import splashBg from '../assets/images/splash-bg.jpg';
import splashLogo from '../assets/images/splash-logo.png';
import menuPc from '../assets/images/main-menu-pc-v2.png';

const ASSETS = [
  // The evidence-room photo: the very first thing on screen, and what the
  // reverse zoom animates. Warm it first so the move always has something
  // to draw.
  menuPc,
  // The boot chain, in the order the player meets it.
  postToneSfx,
  bootLongSfx,
  bootBedSfx,
  diskSfx,
  fanSfx,
  beepSfx,
  splashBg,
  splashLogo,
  startupMp3,
  mailMp3,
  // The big one last — it only plays when the player dials in.
  dialupMp3,
];

let started = false;

export function preloadAssets(): void {
  if (started) return;
  started = true;
  void (async () => {
    for (const src of ASSETS) {
      try {
        // Consume the body so the full file lands in the HTTP cache
        // (preload="auto" on an Audio element is ignored by iOS Safari).
        await (await fetch(src)).arrayBuffer();
      } catch {
        /* offline or blocked — the lazy load path still works, just cold */
      }
    }
  })();
}
