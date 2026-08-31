import { lazy, Suspense, useEffect, useState } from 'react';
import { Chrome } from './theme';
import { AuthGate } from './AuthGate';
import { GameProvider } from './game/GameProvider';
import { useGame } from './game/gameContext';
import { BootSequence } from './os/BootSequence';
import { DesktopShell } from './os/DesktopShell';
import { MainMenu } from './os/MainMenu';
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
  useEffect(() => {
    sessionStorage.removeItem('lastlogin.reboot');
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
  const [powerBoot, setPowerBoot] = useState(false);
  if (!powered) {
    return (
      <MainMenu
        onPower={() => {
          sessionStorage.setItem('lastlogin.power', '1');
          setPowerBoot(true);
          setPowered(true);
        }}
      />
    );
  }

  if (!ready || !view) {
    return <div style={{ height: '100vh', background: '#000' }} />;
  }
  const screen = !view.loggedIn ? (
    <BootSequence />
  ) : rebooting || powerBoot ? (
    <BootSequence
      onResume={() => {
        setRebooting(false);
        setPowerBoot(false);
      }}
    />
  ) : (
    <DesktopShell />
  );
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
