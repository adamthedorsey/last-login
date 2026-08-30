import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Radio, Window, WindowContent, WindowHeader } from 'react95';
import { DosMode } from './DosMode';
import { Bsod } from './Bsod';
import { Icon } from './icons';
import { playError } from './sounds';
import { topWindowId, useWindowStore, TASKBAR_HEIGHT } from './windowStore';
import { getApp } from './appRegistry';
import { WindowFrame } from './WindowFrame';
import { Taskbar } from './Taskbar';
import { DesktopIcons } from './DesktopIcons';
import { AltTabSwitcher } from './AltTabSwitcher';
import { Welcome } from './Welcome';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';
import { Screensaver } from './Screensaver';
import { useSettingsStore } from './settingsStore';

const Desk = styled.div`
  position: fixed;
  inset: 0;
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

type ShutChoice = 'shutdown' | 'restart' | 'dos' | 'logoff';

export function DesktopShell() {
  const { windows, pendingLaunch, completeLaunch, closeAll } = useWindowStore();
  const { toasts, dismissToast, showEndCard, setShowEndCard, view, send, refreshView, lineDropSignal } = useGame();
  const [shutDown, setShutDown] = useState(false);
  const [shutDialog, setShutDialog] = useState(false);
  const [shutChoice, setShutChoice] = useState<ShutChoice>('shutdown');
  const [dosMode, setDosMode] = useState(false);
  const [bsod, setBsod] = useState(false);
  // The one-phone-line scare: fires when the server stamps a result with
  // the pickup notice (exactly one result ever carries it).
  const [lineDrop, setLineDrop] = useState(false);
  const [saverOn, setSaverOn] = useState(false);
  const focusedId = topWindowId(windows);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const saverMinutes = useSettingsStore((s) => s.saverMinutes);
  const saverNonce = useSettingsStore((s) => s.saverNonce);

  // Screen saver: kicks in after idle, any input wakes it (Win95 behavior).
  // A short grace period stops the Start-menu click that launches it from
  // immediately waking it back up.
  const saverStartedAt = useRef(0);
  const startSaver = () => {
    saverStartedAt.current = performance.now();
    setSaverOn(true);
  };
  useEffect(() => {
    if (saverNonce > 0) startSaver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saverNonce]);

  useEffect(() => {
    const idleMs = saverMinutes * 60 * 1000;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        saverStartedAt.current = performance.now();
        setSaverOn(true);
      }, idleMs);
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
  }, [saverMinutes]);

  useEffect(() => {
    if (lineDropSignal === 0) return;
    const t = window.setTimeout(() => {
      playError();
      setLineDrop(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [lineDropSignal]);

  // The blue screen: a 1997 machine is mortal. It surfaces after a random
  // number of clicks (rare enough to shock, never to torment — at most twice
  // a session), loses nothing, and any key continues.
  const clickBudget = useRef(90 + Math.floor(Math.random() * 210));
  const bsodShown = useRef(0);
  const overlayRef = useRef(false);
  overlayRef.current = bsod || saverOn || shutDown || shutDialog || dosMode || showEndCard;
  useEffect(() => {
    const onDown = () => {
      if (overlayRef.current || bsodShown.current >= 2) return;
      clickBudget.current -= 1;
      if (clickBudget.current <= 0) {
        bsodShown.current += 1;
        clickBudget.current = 500 + Math.floor(Math.random() * 400);
        setBsod(true);
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);

  const confirmShutDown = async () => {
    setShutDialog(false);
    if (shutChoice === 'shutdown') {
      setShutDown(true);
    } else if (shutChoice === 'restart') {
      // Full warm reboot: replay the POST, then resume the session.
      sessionStorage.setItem('lastlogin.reboot', '1');
      window.location.reload();
    } else if (shutChoice === 'dos') {
      setDosMode(true);
    } else {
      // "Close all programs and log on as a different user"
      closeAll();
      sessionStorage.setItem('lastlogin.logoff', '1');
      await send({ type: 'logout' });
      await refreshView(); // view.loggedIn flips; App returns to the login screen
    }
  };

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

  if (dosMode) {
    return <DosMode onExit={() => setDosMode(false)} />;
  }

  return (
    <Desk style={{ backgroundColor: wallpaper }}>
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

      {shutDialog && (
        <CenterOverlay onPointerDown={(e) => e.stopPropagation()}>
          <Window style={{ width: 360 }}>
            <WindowHeader>Shut Down</WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <Icon name="computer" size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '2px 0 10px' }}>Are you sure you want to:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Radio
                      checked={shutChoice === 'shutdown'}
                      onChange={() => setShutChoice('shutdown')}
                      label="Shut down the computer?"
                      name="shutchoice"
                    />
                    <Radio
                      checked={shutChoice === 'restart'}
                      onChange={() => setShutChoice('restart')}
                      label="Restart the computer?"
                      name="shutchoice"
                    />
                    <Radio
                      checked={shutChoice === 'dos'}
                      onChange={() => setShutChoice('dos')}
                      label="Restart the computer in MS-DOS mode?"
                      name="shutchoice"
                    />
                    <Radio
                      checked={shutChoice === 'logoff'}
                      onChange={() => setShutChoice('logoff')}
                      label="Close all programs and log on as a different user?"
                      name="shutchoice"
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <Button onClick={() => void confirmShutDown()} style={{ width: 80 }}>
                  Yes
                </Button>
                <Button onClick={() => setShutDialog(false)} style={{ width: 80 }}>
                  No
                </Button>
                <Button disabled style={{ width: 80 }}>
                  Help
                </Button>
              </div>
            </WindowContent>
          </Window>
        </CenterOverlay>
      )}

      {lineDrop && (
        <CenterOverlay onPointerDown={(e) => e.stopPropagation()}>
          <Window style={{ width: 380 }}>
            <WindowHeader style={{ fontSize: 13 }}>Dial-Up Networking</WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon name="warning" size={32} />
                <p style={{ margin: 0 }}>
                  The connection to WestWind Online was terminated: the line
                  was picked up by another extension.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={() => setLineDrop(false)} style={{ width: 80 }}>
                  OK
                </Button>
              </div>
            </WindowContent>
          </Window>
        </CenterOverlay>
      )}

      {SplashComponent && <SplashComponent onDone={completeLaunch} />}
      <AltTabSwitcher />
      <Welcome />
      {saverOn && <Screensaver />}
      {bsod && <Bsod onDismiss={() => setBsod(false)} />}

      <Taskbar
        onShutDown={() => setShutDialog(true)}
        onScreenSaver={startSaver}
        onDosMode={() => setDosMode(true)}
      />
    </Desk>
  );
}
