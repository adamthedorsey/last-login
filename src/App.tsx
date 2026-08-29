import { lazy, Suspense } from 'react';
import { Chrome } from './theme';
import { AuthGate } from './AuthGate';
import { GameProvider } from './game/GameProvider';
import { useGame } from './game/gameContext';
import { BootSequence } from './os/BootSequence';
import { DesktopShell } from './os/DesktopShell';
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
  if (!ready || !view) {
    return <div style={{ height: '100vh', background: '#000' }} />;
  }
  return (
    <>
      {view.loggedIn ? <DesktopShell /> : <BootSequence />}
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
