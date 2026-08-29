import { Chrome } from './theme';
import { AuthGate } from './AuthGate';
import { GameProvider } from './game/GameProvider';
import { useGame } from './game/gameContext';
import { BootSequence } from './os/BootSequence';
import { DesktopShell } from './os/DesktopShell';
import { registerAllApps } from './apps/registerApps';

registerAllApps();

function Screen() {
  const { ready, view } = useGame();
  if (!ready || !view) {
    return <div style={{ height: '100vh', background: '#000' }} />;
  }
  return view.loggedIn ? <DesktopShell /> : <BootSequence />;
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
