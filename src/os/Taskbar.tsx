import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AppBar, Button, Frame, MenuList, MenuListItem, Separator, Toolbar } from 'react95';
import { listApps } from './appRegistry';
import { TASKBAR_HEIGHT, topWindowId, useWindowStore } from './windowStore';
import { Icon } from './icons';
import { isMuted, setMuted } from './sounds';
import { useGame } from '../game/gameContext';

const Bar = styled(AppBar)`
  top: auto;
  bottom: 0;
  height: ${TASKBAR_HEIGHT}px;
  z-index: 100000;
`;

const BarToolbar = styled(Toolbar)`
  display: flex;
  gap: 4px;
  align-items: center;
  height: 100%;
  padding: 0 4px;
`;

const StartLogo = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
`;

const WinButtons = styled.div`
  flex: 1;
  display: flex;
  gap: 3px;
  overflow: hidden;
`;

const WinButton = styled(Button)`
  max-width: 180px;
  min-width: 60px;
  display: flex;
  gap: 5px;
  justify-content: flex-start;
  overflow: hidden;
  white-space: nowrap;
`;

const Tray = styled(Frame).attrs({ variant: 'well' })`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px;
  height: 30px;
`;

const TrayButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
`;

const StartMenu = styled(MenuList)`
  position: absolute;
  left: 4px;
  bottom: ${TASKBAR_HEIGHT}px;
  z-index: 100001;
  min-width: 210px;
`;

const MenuBrand = styled.div`
  background: #000080;
  color: #fff;
  font-weight: bold;
  padding: 6px 8px;
  margin: -4px -4px 4px;
  letter-spacing: 1px;
`;

function formatClock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function Taskbar({ onShutDown }: { onShutDown: () => void }) {
  const { windows, focus, minimize, open } = useWindowStore();
  const { view } = useGame();
  const [startOpen, setStartOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const menuRef = useRef<HTMLDivElement>(null);

  const focusedId = topWindowId(windows);

  useEffect(() => {
    if (!startOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setStartOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [startOpen]);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <>
      {startOpen && (
        <div ref={menuRef}>
          <StartMenu>
            <MenuBrand>HORIZONS 97</MenuBrand>
            {listApps().map((app) => (
              <MenuListItem
                key={app.id}
                onClick={() => {
                  open(app.id);
                  setStartOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Icon name={app.icon} size={20} />
                  {app.name}
                </span>
              </MenuListItem>
            ))}
            <Separator />
            <MenuListItem
              onClick={() => {
                setStartOpen(false);
                onShutDown();
              }}
            >
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <Icon name="computer" size={20} />
                Shut Down...
              </span>
            </MenuListItem>
          </StartMenu>
        </div>
      )}
      <Bar>
        <BarToolbar>
          <Button
            active={startOpen}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            onClick={() => setStartOpen((v) => !v)}
            style={{ fontWeight: 'bold' }}
          >
            <StartLogo>
              <Icon name="computer" size={18} />
              Start
            </StartLogo>
          </Button>
          <Separator orientation="vertical" size="30px" />
          <WinButtons>
            {windows.map((w) => (
              <WinButton
                key={w.id}
                active={w.id === focusedId && !w.minimized}
                onClick={() => {
                  if (w.id === focusedId && !w.minimized) minimize(w.id);
                  else focus(w.id);
                }}
              >
                <Icon name={w.icon} size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</span>
              </WinButton>
            ))}
          </WinButtons>
          <Tray>
            <TrayButton onClick={toggleMute} title={muted ? 'Sound off (click to enable)' : 'Sound on (click to mute)'}>
              {muted ? '🔇' : '🔊'}
            </TrayButton>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {view ? formatClock(view.clockNow) : '--:--'}
            </span>
          </Tray>
        </BarToolbar>
      </Bar>
    </>
  );
}
