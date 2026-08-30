/**
 * The "Welcome to Horizons 95" tips box that greeted every boot — Next Tip,
 * Close, and the little checkbox everyone eventually unticked.
 *
 * The tips are OS chrome (how the machine works), never story content — the
 * drip-feed here is mechanical literacy: Properties timestamps, the Recycle
 * Bin, Find, the phone line.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Frame, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { useSettingsStore } from './settingsStore';
import { Icon } from './icons';

const TIPS = [
  'Files deleted to the Recycle Bin stay on the disk — and can still be read — until the bin is emptied.',
  'To see when a file was created or last changed, click it with the right mouse button and choose Properties.',
  'You can find a file anywhere on this computer: click Start, point to Find, then click Files or Folders.',
  'Hold down Alt and press Tab to switch between the programs you have open.',
  'Connecting to your online service ties up the phone line. Be considerate of others in your home.',
  'You can rename your own files by pressing F2, or by clicking the name of a selected file.',
  'Double-click the clock on the taskbar to check the system date.',
  'To arrange the windows on your screen, click an empty part of the taskbar with the right mouse button.',
  'You can save notes with Notepad. New files are kept on the desktop.',
  'Hold down Ctrl while clicking to select more than one file at a time.',
];

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100002;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Banner = styled.div`
  font-size: 22px;
  font-weight: bold;
  margin: 2px 0 12px;
  white-space: nowrap;
`;

const TipWell = styled(Frame).attrs({ variant: 'well' })`
  background: #fff;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-height: 92px;
`;

/** Whether the box was dismissed since this page load ("this boot"). */
let closedThisBoot = false;

export function Welcome() {
  const { view } = useGame();
  const showWelcome = useSettingsStore((s) => s.showWelcome);
  const setShowWelcome = useSettingsStore((s) => s.setShowWelcome);
  // Unticking the checkbox only affects the NEXT boot — the box stays up
  // until Close, so visibility is latched at mount.
  const [visible, setVisible] = useState(
    () => !closedThisBoot && useSettingsStore.getState().showWelcome,
  );
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  if (!visible || !view?.loggedIn) return null;

  const close = () => {
    closedThisBoot = true;
    setVisible(false);
  };

  return (
    <Overlay>
      <Window shadow style={{ width: 480 }}>
        <WindowHeader style={{ fontSize: 13 }}>Welcome</WindowHeader>
        <WindowContent style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Banner>Welcome to Horizons 95</Banner>
              <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Did you know...</div>
              <TipWell>
                <Icon name="help" size={28} />
                <span>{TIPS[tip]}</span>
              </TipWell>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 130 }}>
              <Button disabled>What's New</Button>
              <Button disabled>Online Registration</Button>
              <Button onClick={() => setTip((t) => (t + 1) % TIPS.length)}>Next Tip</Button>
              <div style={{ flex: 1 }} />
              <Button onClick={close} style={{ fontWeight: 'bold' }}>
                Close
              </Button>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Checkbox
              label="Show this Welcome Screen next time you start Horizons 95"
              checked={showWelcome}
              onChange={() => setShowWelcome(!showWelcome)}
              style={{ fontSize: 13 }}
            />
          </div>
        </WindowContent>
      </Window>
    </Overlay>
  );
}
