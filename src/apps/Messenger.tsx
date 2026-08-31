/**
 * Messenger — the BuddyLine buddy list, in the shape AIM had in 1997: a
 * tall roster window of collapsible groups with online counts and status
 * icons. Single-click selects a buddy; double-click opens an IM window
 * (MessengerIM), one per buddy, exactly like the real thing. The roster
 * itself is server-authored; client strings never name a buddy.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import type { BuddyView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { BuddyIcon } from '../os/BuddyIcon';
import { openIm } from '../os/messenger';
import { playError } from '../os/sounds';
import { OfflineAlert } from '../os/OfflineAlert';
import type { AppWindowProps } from '../os/appRegistry';

const Wrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
`;

const Header = styled.div`
  padding: 2px 2px 5px;
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

const Footer = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 3px 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
`;

const GROUP_ORDER = ['Buddies', 'Family', 'Co-Workers', 'Offline'];

function statusRank(s: BuddyView['status']): number {
  return s === 'online' ? 0 : s === 'idle' ? 1 : s === 'away' ? 2 : 3;
}

export function Messenger({ props }: AppWindowProps) {
  const { send, view, contentEpoch } = useGame();
  const [buddies, setBuddies] = useState<BuddyView[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [offlineAlert, setOfflineAlert] = useState(false);

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

  // A wire notice can ask us to open a specific buddy's IM (a buddy who
  // messaged first) — but the IM window itself does the opening now.
  useEffect(() => {
    const sn = props.openScreenname as string | undefined;
    if (sn) openIm({ screenname: sn, fromWire: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openScreenname, props.wireSeq]);

  const openBuddy = (b: BuddyView) => {
    if (b.canChat) {
      openIm({ screenname: b.screenname, alias: b.alias });
      return;
    }
    if (b.conversationId) {
      openIm({ logItemId: b.conversationId }); // saved log reads offline
      return;
    }
    if (!online) {
      playError();
      setOfflineAlert(true);
    }
  };

  // Group + sort: online first within a group, alphabetical after.
  const grouped = new Map<string, BuddyView[]>();
  for (const b of buddies) {
    const g = grouped.get(b.group) ?? [];
    g.push(b);
    grouped.set(b.group, g);
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

  return (
    <Wrap>
      <Header>
        {online ? (
          <>
            Signed on as <b>{self}</b>
          </>
        ) : (
          <>Offline — saved conversations only. Dial in to see who&apos;s on.</>
        )}
      </Header>
      <Roster>
        {groups.map((g) => {
          const list = [...(grouped.get(g) ?? [])].sort(
            (a, b) => statusRank(a.status) - statusRank(b.status) || a.screenname.localeCompare(b.screenname),
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
        {buddies.length === 0 && (
          <div style={{ color: '#888', padding: 8 }}>Your Buddy List is empty.</div>
        )}
      </Roster>
      <Footer>
        <BuddyIcon status={online ? 'online' : 'offline'} size={16} />
        <span style={{ flex: 1 }}>{online ? 'Available' : 'Offline'}</span>
        <span style={{ color: '#888' }}>double-click to message</span>
      </Footer>
      {offlineAlert && (
        <OfflineAlert
          title="Messenger"
          message="Messenger could not sign on to BuddyLine because this computer is not connected to the Internet. Would you like to connect now?"
          onClose={() => setOfflineAlert(false)}
        />
      )}
    </Wrap>
  );
}
