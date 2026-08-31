/**
 * The crash set-piece: blue screen -> reboot -> "not shut down properly"
 * stamped with the CURRENT in-world clock -> Enter gate -> resume. A
 * game mechanic in waiting; for now it fires from the DEV panel and the
 * first time the player launches Solitaire.
 *
 * Pure machine theater — no story text, no engine state. The one-shot
 * Solitaire trigger is a per-device localStorage flag so the crash can't
 * loop (the reboot reloads the page).
 */

export const CRASH_BOOT_FLAG = 'lastlogin.crash';
const SOLITAIRE_KEY = 'lastlogin.crashed.solitaire';

/** Fired on window; DesktopShell listens and shows the blue screen. */
export function triggerCrash(): void {
  window.dispatchEvent(new CustomEvent('lastlogin:crash'));
}

/** The reboot half: called when the player keys past the blue screen. */
export function rebootFromCrash(): void {
  try {
    sessionStorage.setItem(CRASH_BOOT_FLAG, '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
}

/** One-shot launch trap. Returns true when the launch was eaten by a crash. */
export function maybeCrashOnLaunch(appId: string): boolean {
  if (appId !== 'solitaire') return false;
  try {
    if (localStorage.getItem(SOLITAIRE_KEY) === '1') return false;
    localStorage.setItem(SOLITAIRE_KEY, '1');
  } catch {
    return false;
  }
  triggerCrash();
  return true;
}

/** Dev reset: arm the one-shot traps again. */
export function resetCrashTraps(): void {
  try {
    localStorage.removeItem(SOLITAIRE_KEY);
  } catch {
    /* ignore */
  }
}
