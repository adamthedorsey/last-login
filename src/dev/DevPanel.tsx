/**
 * DEVELOPMENT-ONLY panel. Rendered exclusively behind `import.meta.env.DEV`
 * (see DesktopShell), so it is dead-code-eliminated from production builds.
 * It contains no puzzle answers — it manipulates dev-adapter state directly.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { DevGameClient } from '../game/devGameClient';

const Panel = styled(Window)`
  position: fixed;
  top: 8px;
  right: 8px;
  width: 240px;
  z-index: 200000;
  opacity: 0.96;
`;

const Fab = styled.button`
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 200000;
  background: #222;
  color: #0f0;
  border: 1px solid #0f0;
  font-family: monospace;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.6;
`;

export function DevPanel() {
  const { client, refreshView, send, view } = useGame();
  const [open, setOpen] = useState(false);
  const dev = client instanceof DevGameClient ? client : null;

  if (!open) return <Fab onClick={() => setOpen(true)}>DEV</Fab>;

  const grant = async (discoveryId: string) => {
    dev?.devMutate((s) => {
      if (!s.discoveries.includes(discoveryId)) s.discoveries.push(discoveryId);
    });
    await refreshView();
  };

  // Skip the login puzzle. Flips the flag through the dev adapter's state —
  // production clients have no such path and no password in reach.
  const autoLogin = async () => {
    dev?.devMutate((s) => {
      s.loggedIn = true;
    });
    await refreshView();
  };

  return (
    <Panel>
      <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>DEV tools</span>
        <Button size="sm" onClick={() => setOpen(false)}>
          ×
        </Button>
      </WindowHeader>
      <WindowContent style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        <Button onClick={() => void send({ type: 'resetSeason' })}>Reset season</Button>
        {dev && (
          <>
            {!view?.loggedIn && <Button onClick={() => void autoLogin()}>Auto log in</Button>}
            <Button
              onClick={() => {
                console.log('[DEV] player state', dev.devGetState());
              }}
            >
              Log player state
            </Button>
            <div style={{ fontWeight: 'bold', marginTop: 4 }}>Grant discovery:</div>
            {dev.devListDiscoveries().map((d) => (
              <Button key={d.id} size="sm" onClick={() => void grant(d.id)}>
                {d.title}
              </Button>
            ))}
          </>
        )}
        {!dev && <div>Supabase backend — only reset is available here.</div>}
      </WindowContent>
    </Panel>
  );
}
