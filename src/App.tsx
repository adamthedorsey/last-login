import { lazy, Suspense, useEffect, useState } from 'react';
import { Chrome } from './theme';
import { AuthGate } from './AuthGate';
import { GameProvider } from './game/GameProvider';
import { useGame } from './game/gameContext';
import { BootSequence } from './os/BootSequence';
import { DesktopShell } from './os/DesktopShell';
import { MainMenu } from './os/MainMenu';
import { preloadAssets } from './os/preload';
import { CRASH_BOOT_FLAG } from './os/crash';
import { registerAllApps } from './apps/registerApps';

registerAllApps();

// Dev tooling is lazy-loaded strictly behind the DEV flag so neither the
// panel nor anything it references can reach a production bundle. It lives
// here (not in DesktopShell) so it is reachable from the login screen too.
const DevPanel = import.meta.env.DEV
  ? lazy(() => import('./dev/DevPanel').then((m) => ({ default: m.DevPanel })))
  : null;

function Screen() {
  const { ready, view } = useGame();
  // "Restart the computer" replays the POST, then resumes the session.
  // (Read without consuming — StrictMode runs initializers twice; the flag
  // is cleared once, on mount.)
  const [rebooting, setRebooting] = useState(
    () => sessionStorage.getItem('lastlogin.reboot') === '1',
  );
  // A crash reboot replays the POST with the not-shut-down-properly stamp
  // carrying the CURRENT in-world clock, gated on Enter (see crash.ts).
  const [crashBoot, setCrashBoot] = useState(
    () => sessionStorage.getItem(CRASH_BOOT_FLAG) === '1',
  );
  useEffect(() => {
    sessionStorage.removeItem('lastlogin.reboot');
    sessionStorage.removeItem(CRASH_BOOT_FLAG);
  }, []);

  // The evidence-room main menu: the machine sits powered off until the
  // player presses POWER. The flag lives in sessionStorage, so a reload
  // mid-session is not a power cycle — but Shut Down's safe-to-turn-off
  // click clears it, completing the loop back to the menu.
  const [powered, setPowered] = useState(
    () => sessionStorage.getItem('lastlogin.power') === '1',
  );
  // A power-on with a session still on disk (tab closed mid-play, reopened
  // later) still runs the POST, then resumes — same as a warm restart.
  // With NO live session the flag must clear at once: the ordinary boot
  // handles login, and a lingering flag would trap the post-login render
  // back inside BootSequence (the login dialog would never hand off).
  const [powerBoot, setPowerBoot] = useState(false);
  useEffect(() => {
    if (powerBoot && ready && view && !view.loggedIn) setPowerBoot(false);
  }, [powerBoot, ready, view]);

  const screen = !powered ? (
    <MainMenu
      onPower={() => {
        sessionStorage.setItem('lastlogin.power', '1');
        setPowerBoot(true);
        setPowered(true);
      }}
    />
  ) : !ready || !view ? (
    <div style={{ height: '100vh', background: '#000' }} />
  ) : !view.loggedIn ? (
    <BootSequence />
  ) : rebooting || powerBoot || crashBoot ? (
    <BootSequence
      crashBoot={crashBoot}
      onResume={() => {
        setRebooting(false);
        setPowerBoot(false);
        setCrashBoot(false);
      }}
    />
  ) : (
    <DesktopShell />
  );
  // The dev panel rides every screen, the evidence room included.
  return (
    <>
      {screen}
      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  // Warm the timed sounds/images (boot tones, disk seeks, splash art) so
  // their first real play never waits on the network.
  useEffect(() => {
    preloadAssets();
  }, []);
  return (
    <Chrome>
      <AuthGate>
        <GameProvider>
          <Screen />
        </GameProvider>
      </AuthGate>
    </Chrome>
  );
}
