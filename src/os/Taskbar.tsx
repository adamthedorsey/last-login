import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  AppBar,
  Button,
  DatePicker__UNSTABLE as DatePicker,
  Frame,
  MenuList,
  MenuListItem,
  Separator,
  Toolbar,
  Window,
  WindowContent,
  WindowHeader,
} from 'react95';
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

/**
 * The Win95 tray clock: time only, the date lives in the hover tooltip,
 * and only a DOUBLE-click opens Date/Time — a single click does nothing.
 */
const TrayClock = styled.button`
  border: none;
  background: none;
  padding: 0;
  cursor: default;
  font-size: 13px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-family: inherit;
`;

/** The Date/Time popup sits above the tray, like the Start menu does. */
const DatePopup = styled.div`
  position: absolute;
  right: 4px;
  bottom: ${TASKBAR_HEIGHT + 2}px;
  z-index: 100001;
`;

const StartMenu = styled(MenuList)`
  position: absolute;
  left: 4px;
  bottom: ${TASKBAR_HEIGHT}px;
  z-index: 100001;
  min-width: 210px;
`;

const ProgramsMenu = styled(MenuList)`
  position: absolute;
  left: 216px;
  bottom: ${TASKBAR_HEIGHT}px;
  z-index: 100002;
  min-width: 200px;
  max-height: calc(100vh - ${TASKBAR_HEIGHT + 16}px);
  overflow-y: auto;
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The Win95 clock tooltip: "Saturday, October 18, 1997". */
function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Taskbar({
  onShutDown,
  onScreenSaver,
}: {
  onShutDown: () => void;
  onScreenSaver: () => void;
}) {
  const { windows, focus, minimize, open } = useWindowStore();
  const { view } = useGame();
  const [startOpen, setStartOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [dateOpen, setDateOpen] = useState(false);
  const [dateRefused, setDateRefused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const focusedId = topWindowId(windows);

  useEffect(() => {
    if (!startOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setStartOpen(false);
        setProgramsOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [startOpen]);

  useEffect(() => {
    if (!dateOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!dateRef.current?.contains(e.target as Node)) {
        setDateOpen(false);
        setDateRefused(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [dateOpen]);

  const closeDate = () => {
    setDateOpen(false);
    setDateRefused(false);
  };

  const acceptDate = (chosen: string) => {
    // The in-world clock is frozen season data. Re-selecting the same day is
    // a no-op; trying to CHANGE it gets a period-true refusal (the machine's
    // timestamps are evidence — the game won't let anyone tamper with them).
    if (view && !sameDay(chosen, view.clockNow)) {
      setDateRefused(true);
      return;
    }
    closeDate();
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <>
      {startOpen && (
        <div ref={menuRef} data-no-deskmenu>
          <StartMenu>
            <MenuBrand>HORIZONS 95</MenuBrand>
            <MenuListItem
              onMouseEnter={() => setProgramsOpen(true)}
              onClick={() => setProgramsOpen((v) => !v)}
            >
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', width: '100%' }}>
                <Icon name="folder" size={20} />
                Programs
                <span style={{ marginLeft: 'auto' }}>▸</span>
              </span>
            </MenuListItem>
            <Separator />
            <MenuListItem
              onMouseEnter={() => setProgramsOpen(false)}
              onClick={() => {
                setStartOpen(false);
                onScreenSaver();
              }}
            >
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <Icon name="photo" size={20} />
                Screen Saver
              </span>
            </MenuListItem>
            <MenuListItem
              onMouseEnter={() => setProgramsOpen(false)}
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
          {programsOpen && (
            <ProgramsMenu>
              {listApps().map((app) => (
                <MenuListItem
                  key={app.id}
                  size="sm"
                  onClick={() => {
                    open(app.id);
                    setStartOpen(false);
                    setProgramsOpen(false);
                  }}
                >
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <Icon name={app.icon} size={18} />
                    {app.name}
                  </span>
                </MenuListItem>
              ))}
            </ProgramsMenu>
          )}
        </div>
      )}
      {dateOpen && view && (
        <div ref={dateRef} data-no-deskmenu>
          <DatePopup>
            {dateRefused ? (
              <Window shadow style={{ width: 280 }}>
                <WindowHeader style={{ fontSize: 13 }}>Date/Time</WindowHeader>
                <WindowContent style={{ fontSize: 13 }}>
                  <p style={{ margin: '0 0 12px' }}>
                    The date could not be changed. This computer's clock may
                    need service.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={closeDate} style={{ width: 80 }}>
                      OK
                    </Button>
                  </div>
                </WindowContent>
              </Window>
            ) : (
              <DatePicker
                shadow
                // The picker reads its date with getUTC*; anchor the frozen
                // in-world day to UTC noon so it shows the same calendar day
                // in every player timezone.
                date={`${view.clockNow.slice(0, 10)}T12:00:00Z`}
                onCancel={closeDate}
                onAccept={acceptDate}
              />
            )}
          </DatePopup>
        </div>
      )}
      <Bar data-no-deskmenu>
        <BarToolbar>
          <Button
            active={startOpen}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            onClick={() => {
              setStartOpen((v) => !v);
              setProgramsOpen(false);
            }}
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
            <TrayClock
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
              onDoubleClick={() => {
                setDateOpen((v) => !v);
                setDateRefused(false);
              }}
              title={view ? formatLongDate(view.clockNow) : ''}
            >
              {view ? formatClock(view.clockNow) : '--:--'}
            </TrayClock>
          </Tray>
        </BarToolbar>
      </Bar>
    </>
  );
}
