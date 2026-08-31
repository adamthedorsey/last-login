/**
 * Messenger — the buddy list, in the shape AIM had in 1997: a banner, a
 * roster of collapsible groups with online counts and status icons, a
 * Sign Off / Setup / Help button row, and a Send Instant Message button.
 * Single-click selects a buddy; double-click (or Send Instant Message)
 * opens an IM window, one per buddy. The server-authored roster does the
 * telling; client strings never name a buddy. Away message and added
 * buddies are per-device cosmetic state (os/messengerLocal.ts).
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import type { BuddyView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { BuddyIcon } from '../os/BuddyIcon';
import { openIm } from '../os/messenger';
import { useWindowStore } from '../os/windowStore';
import { playError } from '../os/sounds';
import { OfflineAlert } from '../os/OfflineAlert';
import { CloseGlyph, TitleBarButton } from '../os/glyphs';
import {
  addLocalBuddy,
  DEFAULT_AWAY,
  loadAway,
  loadLocalBuddies,
  removeLocalBuddy,
  saveAway,
  type LocalBuddy,
} from '../os/messengerLocal';
import type { AppWindowProps } from '../os/appRegistry';

const Wrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
`;

/** The brand banner — our own person glyph and wordmark (never AOL's
 * running man). White field, like the AIM logo strip. */
const Banner = styled(Frame).attrs({ variant: 'field' })`
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  flex-shrink: 0;
`;

const Wordmark = styled.span`
  font-weight: bold;
  font-size: 17px;
  color: #000080;
  letter-spacing: 0.5px;
`;

const Header = styled.div`
  padding: 4px 2px 3px;
  color: #444;
  font-size: 12px;
`;

const Roster = styled(Frame).attrs({ variant: 'well' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  padding: 2px;
`;

const GroupHead = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 3px 4px;
  font-weight: bold;
  font-size: 13px;
  color: #000080;
  cursor: var(--cursor-arrow);
`;

const Tri = styled.span`
  font-size: 9px;
  width: 9px;
  display: inline-block;
`;

const BuddyRow = styled.button<{ $selected: boolean; $offline: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  text-align: left;
  padding: 2px 6px 2px 20px;
  font-size: 13px;
  cursor: var(--cursor-arrow);
  color: ${(p) => (p.$offline ? '#8a8a8a' : '#000')};
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  ${(p) => p.$selected && 'color: #fff;'}
  span.away {
    color: ${(p) => (p.$selected ? '#d7d7ff' : '#888')};
    font-style: italic;
    margin-left: 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

/** The Sign Off / Setup / Help row: three raised buttons with a small
 * glyph over a label, exactly the AIM footer. */
const ToolRow = styled.div`
  display: flex;
  gap: 3px;
  margin-top: 4px;
  flex-shrink: 0;
`;

const ToolBtn = styled(Button)`
  flex: 1;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
`;

const SendRow = styled.div`
  margin-top: 3px;
  flex-shrink: 0;
`;

const DialogOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
`;

const Field = styled.div`
  margin-bottom: 12px;
  label {
    display: block;
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 13px;
  }
`;

const GROUP_ORDER = ['Buddies', 'Family', 'Co-Workers', 'Offline'];
const ADD_GROUPS = ['Buddies', 'Family', 'Co-Workers'];

function statusRank(s: BuddyView['status']): number {
  return s === 'online' ? 0 : s === 'idle' ? 1 : s === 'away' ? 2 : 3;
}

/** A tiny gear glyph for Setup, drawn in pixels. */
const Gear = () => (
  <svg width={16} height={16} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
    <rect x={6} y={1} width={4} height={14} fill="#404040" />
    <rect x={1} y={6} width={14} height={4} fill="#404040" />
    <rect x={5} y={5} width={6} height={6} fill="#808080" />
    <rect x={6} y={6} width={4} height={4} fill="#c0c0c0" />
  </svg>
);

export function Messenger({ windowId, props }: AppWindowProps) {
  const { send, view, contentEpoch } = useGame();
  const close = useWindowStore((s) => s.close);
  const [buddies, setBuddies] = useState<BuddyView[]>([]);
  const [localBuddies, setLocalBuddies] = useState<LocalBuddy[]>(loadLocalBuddies);
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [offlineAlert, setOfflineAlert] = useState(false);
  const [away, setAway] = useState<string | null>(loadAway);
  const [dialog, setDialog] = useState<'setup' | 'help' | null>(null);
  // Setup form state
  const [awayDraft, setAwayDraft] = useState(away ?? DEFAULT_AWAY);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Buddies');

  const self = view?.imScreenname ?? 'me';
  const online = view?.online === true;

  useEffect(() => {
    let canceled = false;
    void send({ type: 'getBuddies' }).then((res) => {
      if (!canceled && res.type === 'buddies') setBuddies(res.buddies);
    });
    return () => {
      canceled = true;
    };
  }, [send, contentEpoch]);

  useEffect(() => {
    const sn = props.openScreenname as string | undefined;
    if (sn) openIm({ screenname: sn, fromWire: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openScreenname, props.wireSeq]);

  const selectedBuddy = () =>
    buddies.find((b) => b.screenname === selected) ??
    localBuddies
      .map((l) => ({ screenname: l.screenname, group: l.group, status: 'offline' as const }))
      .find((b) => b.screenname === selected);

  const openBuddy = (b: { screenname: string; canChat?: boolean; conversationId?: string }) => {
    if (b.canChat) {
      openIm({ screenname: b.screenname });
      return;
    }
    if (b.conversationId) {
      openIm({ logItemId: b.conversationId });
      return;
    }
    if (!online) {
      playError();
      setOfflineAlert(true);
    }
  };

  // Server roster + the player's own added buddies (offline stubs).
  const grouped = new Map<string, BuddyView[]>();
  for (const b of buddies) {
    const g = grouped.get(b.group) ?? [];
    g.push(b);
    grouped.set(b.group, g);
  }
  for (const l of localBuddies) {
    if (buddies.some((b) => b.screenname.toLowerCase() === l.screenname.toLowerCase())) continue;
    const stub: BuddyView = { screenname: l.screenname, group: l.group, status: 'offline' };
    const g = grouped.get(l.group) ?? [];
    g.push(stub);
    grouped.set(l.group, g);
  }
  const groups = [...grouped.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

  const toggle = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const doAddBuddy = () => {
    const name = newName.trim();
    if (!name) return;
    setLocalBuddies(addLocalBuddy({ screenname: name, group: newGroup }));
    setNewName('');
  };

  const setAwayMessage = (msg: string | null) => {
    setAway(msg);
    saveAway(msg);
  };

  return (
    <Wrap>
      <Banner>
        <BuddyIcon status="online" size={26} />
        <Wordmark>Messenger</Wordmark>
      </Banner>
      <Header>
        {online ? (
          <>
            Signed on as <b>{self}</b>
            {away && <span style={{ color: '#a06000' }}> · Away</span>}
          </>
        ) : (
          <>Offline — saved conversations only. Dial in to see who&apos;s on.</>
        )}
      </Header>
      <Roster>
        {groups.map((g) => {
          const list = [...(grouped.get(g) ?? [])].sort(
            (a, b) =>
              statusRank(a.status) - statusRank(b.status) ||
              a.screenname.localeCompare(b.screenname),
          );
          const onCount = list.filter((b) => b.status !== 'offline').length;
          const isCollapsed = collapsed.has(g);
          return (
            <div key={g}>
              <GroupHead onClick={() => toggle(g)}>
                <Tri>{isCollapsed ? '▶' : '▼'}</Tri>
                {g} ({onCount}/{list.length})
              </GroupHead>
              {!isCollapsed &&
                list.map((b) => (
                  <BuddyRow
                    key={b.screenname}
                    $selected={selected === b.screenname}
                    $offline={b.status === 'offline'}
                    title={
                      b.status === 'away'
                        ? `Away${b.awayMessage ? `: ${b.awayMessage}` : ''}`
                        : b.status[0].toUpperCase() + b.status.slice(1)
                    }
                    onClick={() => setSelected(b.screenname)}
                    onDoubleClick={() => openBuddy(b)}
                  >
                    <BuddyIcon status={b.status} size={16} />
                    <span>
                      {b.alias ?? b.screenname}
                      {b.status === 'idle' ? ' (idle)' : ''}
                    </span>
                    {b.status === 'away' && b.awayMessage && (
                      <span className="away">— {b.awayMessage}</span>
                    )}
                  </BuddyRow>
                ))}
            </div>
          );
        })}
        {groups.length === 0 && (
          <div style={{ color: '#888', padding: 8 }}>Your Buddy List is empty.</div>
        )}
      </Roster>

      <ToolRow>
        <ToolBtn onClick={() => close(windowId)}>
          <BuddyIcon status="offline" size={16} />
          Sign Off
        </ToolBtn>
        <ToolBtn
          onClick={() => {
            setAwayDraft(away ?? DEFAULT_AWAY);
            setDialog('setup');
          }}
        >
          <Gear />
          Setup...
        </ToolBtn>
        <ToolBtn onClick={() => setDialog('help')}>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>?</span>
          Help
        </ToolBtn>
      </ToolRow>
      <SendRow>
        <Button
          fullWidth
          disabled={!selected}
          onClick={() => {
            const b = selectedBuddy();
            if (b) openBuddy(b);
          }}
        >
          Send Instant Message
        </Button>
      </SendRow>

      {dialog === 'setup' && (
        <DialogOverlay>
          <Window style={{ width: 300 }}>
            <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Setup</span>
              <TitleBarButton onClick={() => setDialog(null)} aria-label="Close">
                <CloseGlyph />
              </TitleBarButton>
            </WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <Field>
                <label htmlFor="msg-away">Away Message</label>
                <TextInput
                  id="msg-away"
                  multiline
                  rows={3}
                  value={awayDraft}
                  onChange={(e) => setAwayDraft(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Button
                    onClick={() => {
                      setAwayMessage(awayDraft.trim() || DEFAULT_AWAY);
                      setDialog(null);
                    }}
                  >
                    Set Away
                  </Button>
                  <Button disabled={!away} onClick={() => setAwayMessage(null)}>
                    I&apos;m Available
                  </Button>
                </div>
              </Field>
              <Field>
                <label htmlFor="msg-add">Add Buddy</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <TextInput
                    id="msg-add"
                    placeholder="Screen name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doAddBuddy()}
                    style={{ flex: 1 }}
                  />
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    style={{ fontFamily: 'inherit', fontSize: 13 }}
                  >
                    {ADD_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Button disabled={!newName.trim()} onClick={doAddBuddy}>
                    Add
                  </Button>
                </div>
                {localBuddies.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {localBuddies.map((l) => (
                      <div
                        key={l.screenname}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '1px 0' }}
                      >
                        <span style={{ flex: 1 }}>
                          {l.screenname} <span style={{ color: '#888' }}>({l.group})</span>
                        </span>
                        <button
                          onClick={() => setLocalBuddies(removeLocalBuddy(l.screenname))}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#a40000',
                            cursor: 'var(--cursor-arrow)',
                            fontSize: 12,
                          }}
                        >
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => setDialog(null)} style={{ width: 80 }}>
                  Close
                </Button>
              </div>
            </WindowContent>
          </Window>
        </DialogOverlay>
      )}

      {dialog === 'help' && (
        <DialogOverlay>
          <Window style={{ width: 280 }}>
            <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Messenger Help</span>
              <TitleBarButton onClick={() => setDialog(null)} aria-label="Close">
                <CloseGlyph />
              </TitleBarButton>
            </WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <p style={{ margin: '2px 0 12px' }}>
                Double-click a buddy to send an instant message. Use Setup to set
                an away message or add a buddy.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => setDialog(null)} style={{ width: 80 }}>
                  OK
                </Button>
              </div>
            </WindowContent>
          </Window>
        </DialogOverlay>
      )}

      {offlineAlert && (
        <OfflineAlert
          title="Messenger"
          message="Messenger could not sign on because this computer is not connected to the Internet. Would you like to connect now?"
          onClose={() => setOfflineAlert(false)}
        />
      )}
    </Wrap>
  );
}
