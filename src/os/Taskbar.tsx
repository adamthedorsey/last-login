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
  TextInput,
  Toolbar,
  Window,
  WindowContent,
  WindowHeader,
} from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { listApps } from './appRegistry';
import { TASKBAR_HEIGHT, topWindowId, useWindowStore } from './windowStore';
import { Icon } from './icons';
import { isMuted, setMuted } from './sounds';
import { launchItem } from './launch';
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

/** The Start menu proper: sidebar + item column, one raised panel. */
const StartMenuBox = styled.div`
  position: absolute;
  left: 4px;
  bottom: ${TASKBAR_HEIGHT}px;
  z-index: 100001;
  display: flex;
  background: #d4d0c8;
  border: 2px solid;
  border-color: #fff #404040 #404040 #fff;
  box-shadow: 1px 1px 0 #000;
`;

/** Win95's vertical brand stripe, reading bottom-up. */
const SideBar = styled.div`
  width: 26px;
  background: #7f7f7f;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
`;

const SideText = styled.span`
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  color: #d4d0c8;
  font-weight: bold;
  font-size: 18px;
  letter-spacing: 1px;
  white-space: nowrap;
  b {
    color: #fff;
  }
`;

const MenuCol = styled(MenuList)`
  border: none;
  box-shadow: none;
  min-width: 190px;
`;

const SubMenu = styled(MenuList)<{ $left: number }>`
  position: absolute;
  left: ${(p) => p.$left}px;
  bottom: ${TASKBAR_HEIGHT + 2}px;
  z-index: 100002;
  min-width: 185px;
  max-height: calc(100vh - ${TASKBAR_HEIGHT + 16}px);
  overflow-y: auto;
`;

/** Small dialogs the Start menu spawns (Run..., Help), bottom-left. */
const StartDialog = styled.div`
  position: absolute;
  left: 4px;
  bottom: ${TASKBAR_HEIGHT + 2}px;
  z-index: 100003;
`;

const ItemRow = ({ icon, size = 20, children }: { icon: string; size?: number; children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', width: '100%' }}>
    <Icon name={icon} size={size} />
    {children}
  </span>
);

const Chevron = () => <span style={{ marginLeft: 'auto', paddingLeft: 12 }}>▸</span>;

// x-offsets for the cascade columns (sidebar + main, then one submenu deep).
const SUB_X = 4 + 26 + 192;
const SUB2_X = SUB_X + 187;

type SubName = 'programs' | 'documents' | 'settings' | 'find' | null;
type Sub2Name = 'accessories' | 'games' | null;

// Which registered apps live where (everything else lands under Programs).
const ACCESSORY_IDS = ['calculator', 'calendar', 'clock', 'notepad', 'paintbox', 'photos', 'sysmon'];
const GAME_IDS = ['solitaire', 'minefield'];
const SETTINGS_IDS = ['display'];
const NON_PROGRAM_IDS = new Set([...ACCESSORY_IDS, ...GAME_IDS, ...SETTINGS_IDS, 'recycle']);

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
  onDosMode,
}: {
  onShutDown: () => void;
  onScreenSaver: () => void;
  onDosMode: () => void;
}) {
  const { windows, focus, minimize, open } = useWindowStore();
  const { view, send } = useGame();
  const [startOpen, setStartOpen] = useState(false);
  const [sub, setSub] = useState<SubName>(null);
  const [sub2, setSub2] = useState<Sub2Name>(null);
  const [recentDocs, setRecentDocs] = useState<ItemSummary[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [runText, setRunText] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [dateOpen, setDateOpen] = useState(false);
  const [dateRefused, setDateRefused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const focusedId = topWindowId(windows);

  useEffect(() => {
    if (!startOpen && !helpOpen && !runOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setStartOpen(false);
        setSub(null);
        setSub2(null);
        setHelpOpen(false);
        setRunOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [startOpen, helpOpen, runOpen]);

  // "Documents" lists the player's own saved files (their case notes).
  useEffect(() => {
    if (!startOpen) return;
    void send({ type: 'getDesktop' }).then((res) => {
      if (res.type === 'desktop') {
        setRecentDocs(res.items.filter((i) => i.editable && i.kind === 'document'));
      }
    });
  }, [startOpen, send]);

  const closeStart = () => {
    setStartOpen(false);
    setSub(null);
    setSub2(null);
  };

  const runProgram = () => {
    const q = runText.trim().toLowerCase();
    if (!q) return;
    const hit = listApps().find((a) => a.id === q || a.name.toLowerCase() === q);
    if (hit) {
      open(hit.id);
      setRunOpen(false);
      setRunText('');
      setRunError(null);
      return;
    }
    if (['dos', 'command', 'command.com', 'cmd', 'ms-dos'].includes(q)) {
      onDosMode();
      setRunOpen(false);
      setRunText('');
      setRunError(null);
      return;
    }
    setRunError(`Cannot find the file '${runText.trim()}'. Make sure you typed the name correctly.`);
  };

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
      {(startOpen || helpOpen || runOpen) && (
        <div ref={menuRef} data-no-deskmenu>
          {startOpen && (
            <StartMenuBox>
              <SideBar>
                <SideText>
                  Horizons<b>95</b>
                </SideText>
              </SideBar>
              <MenuCol>
                <MenuListItem onMouseEnter={() => { setSub('programs'); setSub2(null); }}>
                  <ItemRow icon="folder">
                    <span><u>P</u>rograms</span>
                    <Chevron />
                  </ItemRow>
                </MenuListItem>
                <MenuListItem onMouseEnter={() => { setSub('documents'); setSub2(null); }}>
                  <ItemRow icon="folder-docs">
                    <span><u>D</u>ocuments</span>
                    <Chevron />
                  </ItemRow>
                </MenuListItem>
                <MenuListItem onMouseEnter={() => { setSub('settings'); setSub2(null); }}>
                  <ItemRow icon="settings">
                    <span><u>S</u>ettings</span>
                    <Chevron />
                  </ItemRow>
                </MenuListItem>
                <MenuListItem onMouseEnter={() => { setSub('find'); setSub2(null); }}>
                  <ItemRow icon="find">
                    <span><u>F</u>ind</span>
                    <Chevron />
                  </ItemRow>
                </MenuListItem>
                <MenuListItem
                  onMouseEnter={() => { setSub(null); setSub2(null); }}
                  onClick={() => { closeStart(); setHelpOpen(true); }}
                >
                  <ItemRow icon="help"><span><u>H</u>elp</span></ItemRow>
                </MenuListItem>
                <MenuListItem
                  onMouseEnter={() => { setSub(null); setSub2(null); }}
                  onClick={() => { closeStart(); setRunOpen(true); setRunError(null); }}
                >
                  <ItemRow icon="run"><span><u>R</u>un...</span></ItemRow>
                </MenuListItem>
                <Separator />
                <MenuListItem
                  onMouseEnter={() => { setSub(null); setSub2(null); }}
                  onClick={() => { closeStart(); onShutDown(); }}
                >
                  <ItemRow icon="computer"><span>Sh<u>u</u>t Down...</span></ItemRow>
                </MenuListItem>
              </MenuCol>
            </StartMenuBox>
          )}

          {startOpen && sub === 'programs' && (
            <SubMenu $left={SUB_X}>
              <MenuListItem size="sm" onMouseEnter={() => setSub2('accessories')}>
                <ItemRow icon="folder" size={18}>
                  <span>Accessories</span>
                  <Chevron />
                </ItemRow>
              </MenuListItem>
              <MenuListItem size="sm" onMouseEnter={() => setSub2('games')}>
                <ItemRow icon="folder" size={18}>
                  <span>Games</span>
                  <Chevron />
                </ItemRow>
              </MenuListItem>
              <Separator />
              {listApps()
                .filter((a) => !NON_PROGRAM_IDS.has(a.id))
                .map((app) => (
                  <MenuListItem key={app.id} size="sm" onMouseEnter={() => setSub2(null)} onClick={() => { open(app.id); closeStart(); }}>
                    <ItemRow icon={app.icon} size={18}><span>{app.name}</span></ItemRow>
                  </MenuListItem>
                ))}
              <Separator />
              <MenuListItem size="sm" onMouseEnter={() => setSub2(null)} onClick={() => { closeStart(); onDosMode(); }}>
                <ItemRow icon="display" size={18}><span>MS-DOS Prompt</span></ItemRow>
              </MenuListItem>
            </SubMenu>
          )}
          {startOpen && sub === 'programs' && sub2 && (
            <SubMenu $left={SUB2_X}>
              {listApps()
                .filter((a) => (sub2 === 'accessories' ? ACCESSORY_IDS : GAME_IDS).includes(a.id))
                .map((app) => (
                  <MenuListItem key={app.id} size="sm" onClick={() => { open(app.id); closeStart(); }}>
                    <ItemRow icon={app.icon} size={18}><span>{app.name}</span></ItemRow>
                  </MenuListItem>
                ))}
            </SubMenu>
          )}

          {startOpen && sub === 'documents' && (
            <SubMenu $left={SUB_X}>
              {recentDocs.length === 0 && (
                <MenuListItem size="sm" disabled>
                  <span style={{ color: '#808080' }}>(Empty)</span>
                </MenuListItem>
              )}
              {recentDocs.map((doc) => (
                <MenuListItem key={doc.id} size="sm" onClick={() => { launchItem(doc); closeStart(); }}>
                  <ItemRow icon="doc" size={18}><span>{doc.name}</span></ItemRow>
                </MenuListItem>
              ))}
            </SubMenu>
          )}

          {startOpen && sub === 'settings' && (
            <SubMenu $left={SUB_X}>
              <MenuListItem size="sm" onClick={() => { open('display'); closeStart(); }}>
                <ItemRow icon="display" size={18}><span>Display</span></ItemRow>
              </MenuListItem>
              <MenuListItem size="sm" onClick={() => { closeStart(); onScreenSaver(); }}>
                <ItemRow icon="photo" size={18}><span>Screen Saver</span></ItemRow>
              </MenuListItem>
            </SubMenu>
          )}

          {startOpen && sub === 'find' && (
            <SubMenu $left={SUB_X}>
              <MenuListItem size="sm" onClick={() => { open('browser'); closeStart(); }}>
                <ItemRow icon="find" size={18}><span>On the Internet...</span></ItemRow>
              </MenuListItem>
            </SubMenu>
          )}

          {helpOpen && (
            <StartDialog>
              <Window shadow style={{ width: 320 }}>
                <WindowHeader style={{ fontSize: 13 }}>Help</WindowHeader>
                <WindowContent style={{ fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Icon name="help" size={28} />
                    <p style={{ margin: 0 }}>
                      Horizons Help could not find any help files on this
                      computer.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <Button onClick={() => setHelpOpen(false)} style={{ width: 80 }}>
                      OK
                    </Button>
                  </div>
                </WindowContent>
              </Window>
            </StartDialog>
          )}

          {runOpen && (
            <StartDialog>
              <Window shadow style={{ width: 360 }}>
                <WindowHeader style={{ fontSize: 13 }}>Run</WindowHeader>
                <WindowContent style={{ fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Icon name="run" size={28} />
                    <p style={{ margin: 0 }}>
                      Type the name of a program, and Horizons will open it
                      for you.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runProgram();
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                      <label htmlFor="run-input">Open:</label>
                      <TextInput
                        id="run-input"
                        value={runText}
                        onChange={(e) => { setRunText(e.target.value); setRunError(null); }}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                    </div>
                    {runError && (
                      <div style={{ marginTop: 8, color: '#802020' }}>{runError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                      <Button type="submit" style={{ width: 80 }}>
                        OK
                      </Button>
                      <Button type="button" onClick={() => { setRunOpen(false); setRunText(''); setRunError(null); }} style={{ width: 80 }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </WindowContent>
              </Window>
            </StartDialog>
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
              setSub(null);
              setSub2(null);
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
