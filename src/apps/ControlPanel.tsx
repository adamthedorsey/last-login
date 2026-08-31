/**
 * The Control Panel applets: System, Date/Time, Sounds, Mouse, Add/Remove.
 * All chrome, no story — the machine explaining itself in 1995 manual voice.
 * Anything that would CHANGE the machine is refused or disabled: this
 * computer is evidence and stays exactly as it was found.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Frame, Radio, ScrollView, Select } from 'react95';
import { useGame } from '../game/gameContext';
import { isMuted, setMuted } from '../os/sounds';
import { Icon } from '../os/icons';

const Rule = styled.div`
  height: 2px;
  border-top: 1px solid #808080;
  border-bottom: 1px solid #fff;
  margin: 9px 0;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  font-size: 13px;
  margin: 3px 0;
  span:first-child {
    width: 110px;
    flex-shrink: 0;
    color: #333;
  }
`;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formatted straight from the frozen ISO clock — never the player's time. */
function longStamp(iso: string): { date: string; time: string } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const hh = Number(iso.slice(11, 13));
  const mm = iso.slice(14, 16);
  return {
    date: `${weekday}, ${MONTHS[m - 1]} ${d}, ${y}`,
    time: `${hh % 12 || 12}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`,
  };
}

// --- System (the General tab everyone screenshotted) -----------------------

export function SystemApplet() {
  const { view } = useGame();
  return (
    <ScrollView style={{ flex: 1, padding: 6 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <Icon name="computer" size={36} />
        <div style={{ fontSize: 13, flex: 1 }}>
          <b>System:</b>
          <div style={{ marginLeft: 12 }}>
            Microtech Horizons 95
            <br />
            4.00.950
          </div>
          <Rule />
          <b>Registered to:</b>
          <div style={{ marginLeft: 12 }}>
            {view?.owner ?? 'the registered owner'}
            <br />
            24796-OEM-0014736-66386
          </div>
          <Rule />
          <b>Computer:</b>
          <div style={{ marginLeft: 12 }}>
            Meridian MT-586
            <br />
            133 MHz processor
            <br />
            32.0MB RAM
          </div>
        </div>
      </div>
    </ScrollView>
  );
}

// --- Date/Time -------------------------------------------------------------

export function DateTimeApplet() {
  const { view } = useGame();
  const [refused, setRefused] = useState(false);
  const stamp = view ? longStamp(view.clockNow) : null;
  return (
    <div style={{ fontSize: 13, padding: 4 }}>
      <Row>
        <span>Date:</span>
        <b>{stamp?.date ?? '—'}</b>
      </Row>
      <Row>
        <span>Time:</span>
        <b>{stamp?.time ?? '—'}</b>
      </Row>
      <Rule />
      <Row>
        <span>Time zone:</span>
        <span>(GMT-05:00) Eastern Time (US &amp; Canada)</span>
      </Row>
      <Rule />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={() => setRefused(true)} style={{ whiteSpace: 'nowrap', padding: '0 16px' }}>
          Change Date/Time...
        </Button>
      </div>
      {refused && (
        <Frame variant="well" style={{ marginTop: 10, padding: '6px 8px' }}>
          The date could not be changed. This computer's clock may need
          service.
        </Frame>
      )}
    </div>
  );
}

// --- Sounds ----------------------------------------------------------------

const SOUND_EVENTS = [
  'Asterisk',
  'Critical Stop',
  'Default sound',
  'Exclamation',
  'Incoming Message',
  'New Mail Notification',
  'Start Horizons 95',
];

export function SoundsApplet() {
  const [muted, setMutedState] = useState(isMuted());
  return (
    <>
      <div style={{ fontSize: 13, marginBottom: 4 }}>Events:</div>
      <ScrollView style={{ flex: 1, minHeight: 0, background: '#fff' }}>
        {SOUND_EVENTS.map((e) => (
          <div key={e} style={{ padding: '2px 8px', fontSize: 13 }}>
            {e}
          </div>
        ))}
      </ScrollView>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', fontSize: 13 }}>
        <span>Scheme:</span>
        <Select
          disabled
          options={[{ label: 'Horizons Default', value: 'default' }]}
          value="default"
          width={200}
        />
      </div>
      <Checkbox
        label="Mute all sounds"
        checked={muted}
        onChange={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
        style={{ fontSize: 13 }}
      />
    </>
  );
}

// --- Mouse -----------------------------------------------------------------

/** The double-click test area: the jack-in-the-box, faithfully pointless. */
export function MouseApplet() {
  const [popped, setPopped] = useState(false);
  return (
    <div style={{ fontSize: 13, padding: 4 }}>
      <b>Button configuration</b>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0 0 12px' }}>
        <Radio checked disabled label="Right-handed" name="hand" readOnly />
        <Radio checked={false} disabled label="Left-handed" name="hand" readOnly />
      </div>
      <Rule />
      <b>Double-click speed</b>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '8px 0' }}>
        <span>Slow</span>
        <Frame variant="well" style={{ flex: 1, height: 10, position: 'relative' }}>
          <div
            style={{
              position: 'absolute', left: '55%', top: -4,
              width: 10, height: 16, background: '#d4d0c8',
              border: '2px outset #dfdfdf',
            }}
          />
        </Frame>
        <span>Fast</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span>Test area:</span>
        <Frame
          variant="well"
          onDoubleClick={() => setPopped((p) => !p)}
          style={{
            width: 64, height: 48, background: popped ? '#ffff99' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, cursor: 'default', userSelect: 'none',
          }}
        >
          {popped ? '☺' : ''}
        </Frame>
      </div>
    </div>
  );
}

// --- Add/Remove Programs ---------------------------------------------------

const INSTALLED = [
  'Messenger 2.4',
  'Kava Runtime 1.1',
  'Minefield',
  'NetVoyager 3.0',
  'Prism Media Viewer',
  'Solitaire',
  'WestWind Online 4.0 Setup',
];

export function AddRemoveApplet() {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      <div style={{ fontSize: 13, marginBottom: 4 }}>
        The following software can be automatically removed by Horizons:
      </div>
      <ScrollView style={{ flex: 1, minHeight: 0, background: '#fff' }}>
        {INSTALLED.map((p) => (
          <div
            key={p}
            onClick={() => setSel(p)}
            style={{
              padding: '2px 8px', fontSize: 13, cursor: 'default',
              background: sel === p ? '#000080' : 'transparent',
              color: sel === p ? '#fff' : 'inherit',
            }}
          >
            {p}
          </div>
        ))}
      </ScrollView>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button disabled style={{ width: 90 }}>
          Install...
        </Button>
        <Button disabled style={{ width: 110 }}>
          Add/Remove...
        </Button>
      </div>
    </>
  );
}
