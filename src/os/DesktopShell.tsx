import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Window, WindowContent, WindowHeader } from 'react95';
import { topWindowId, useWindowStore, TASKBAR_HEIGHT } from './windowStore';
import { getApp } from './appRegistry';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { DesktopIcons } from './DesktopIcons';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';
import { Screensaver } from './Screensaver';

const SCREENSAVER_IDLE_MS = 3 * 60 * 1000;

// Dev tooling is lazy-loaded strictly behind the DEV flag so neither the
// panel nor anything it references can reach a production bundle.
const DevPanel = import.meta.env.DEV
  ? lazy(() => import('../dev/DevPanel').then((m) => ({ default: m.DevPanel })))
  : null;

const Desk = styled.div`
  position: fixed;
  inset: 0;
  background-color: #008080;
  overflow: hidden;
`;

const WindowLayer = styled.div`
  position: absolute;
  inset: 0 0 ${TASKBAR_HEIGHT}px 0;
  /* The layer itself must not swallow desktop clicks — windows re-enable. */
  pointer-events: none;
`;

const ToastStack = styled.div`
  position: fixed;
  right: 10px;
  bottom: ${TASKBAR_HEIGHT + 8}px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100002;
  max-width: 300px;
`;

const ToastCard = styled(Window)`
  width: 300px;
  font-size: 13px;
`;

const CenterOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  z-index: 100003;
`;

const ShutdownScreen = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  color: #ff9a3c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-family: ${PIXEL_MONO};
  text-align: center;
  z-index: 100005;
  cursor: pointer;
`;

export function DesktopShell() {
  const { windows, pendingLaunch, completeLaunch } = useWindowStore();
  const { toasts, dismissToast, showEndCard, setShowEndCard, view } = useGame();
  const [shutDown, setShutDown] = useState(false);
  const [saverOn, setSaverOn] = useState(false);
  const focusedId = topWindowId(windows);

  // Screen saver: kicks in after idle, any input wakes it (Win95 behavior).
  // A short grace period stops the Start-menu click that launches it from
  // immediately waking it back up.
  const saverStartedAt = useRef(0);
  const startSaver = () => {
    saverStartedAt.current = performance.now();
    setSaverOn(true);
  };
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        saverStartedAt.current = performance.now();
        setSaverOn(true);
      }, SCREENSAVER_IDLE_MS);
    };
    const onActivity = () => {
      if (performance.now() - saverStartedAt.current > 600) setSaverOn(false);
      arm();
    };
    arm();
    window.addEventListener('pointermove', onActivity);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);

  // An app launch waiting on its startup splash (e.g. NetVoyager).
  const SplashComponent = pendingLaunch ? getApp(pendingLaunch.appId)?.splash : undefined;

  // Auto-dismiss toasts after a while; keep it quiet.
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = window.setTimeout(() => dismissToast(toasts[0].id), 9000);
    return () => window.clearTimeout(t);
  }, [toasts, dismissToast]);

  if (shutDown) {
    return (
      <ShutdownScreen onClick={() => setShutDown(false)}>
        It is now safe to turn off
        <br />
        this computer.
      </ShutdownScreen>
    );
  }

  return (
    <Desk>
      <DesktopIcons />
      <WindowLayer>
        {windows.map((w) => (
          <WindowFrame key={w.id} win={w} focused={w.id === focusedId} />
        ))}
      </WindowLayer>

      <ToastStack>
        {toasts.map((t) => (
          <ToastCard key={t.id} onClick={() => dismissToast(t.id)}>
            <WindowHeader style={{ fontSize: 13 }}>{t.title}</WindowHeader>
            <WindowContent style={{ padding: 8 }}>{t.description}</WindowContent>
          </ToastCard>
        ))}
      </ToastStack>

      {showEndCard && (
        <CenterOverlay>
          <Window style={{ width: 430 }}>
            <WindowHeader>End of Season 1 demo</WindowHeader>
            <WindowContent>
              {/* Story text comes from the server-earned discovery — never hardcoded here. */}
              {view && view.discoveries.length > 0 && (
                <>
                  <p style={{ marginTop: 0 }}>
                    <b>{view.discoveries[view.discoveries.length - 1].title}</b>
                  </p>
                  <p>{view.discoveries[view.discoveries.length - 1].description}</p>
                </>
              )}
              <p style={{ opacity: 0.75 }}>
                That's where this build of the story stops. The computer stays on — feel free to
                keep looking around{view?.owner ? ` ${view.owner.split(' ')[0]}'s` : ''} machine.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowEndCard(false)} style={{ width: 100 }}>
                  Close
                </Button>
              </div>
            </WindowContent>
          </Window>
        </CenterOverlay>
      )}

      {SplashComponent && <SplashComponent onDone={completeLaunch} />}
      {saverOn && <Screensaver />}

      <Taskbar onShutDown={() => setShutDown(true)} onScreenSaver={startSaver} />
      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </Desk>
  );
}
