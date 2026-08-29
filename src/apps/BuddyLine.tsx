import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame, TextInput } from 'react95';
import type { BuddyView, ItemContent } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import type { AppWindowProps } from '../os/appRegistry';

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 4px;
  margin-top: 2px;
`;

const ListPane = styled(Frame).attrs({ variant: 'well' })`
  overflow: auto;
  padding: 4px;
  font-size: 13px;
`;

const GroupHead = styled.div`
  font-weight: bold;
  padding: 4px 4px 2px;
  color: #000080;
`;

const BuddyRow = styled.button<{ $offline: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 2px 10px;
  font-size: 13px;
  cursor: default;
  color: ${(p) => (p.$offline ? '#888' : '#000')};
  font-style: ${(p) => (p.$offline ? 'italic' : 'normal')};
  &:hover {
    background: #000080;
    color: #fff;
  }
`;

const ChatPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const LogInfo = styled(Frame).attrs({ variant: 'well' })`
  padding: 2px 8px;
  font-size: 12px;
  margin-bottom: 4px;
  flex-shrink: 0;
`;

const Messages = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  padding: 6px 8px;
  font-size: 13px;
  user-select: text;
  line-height: 1.4;
`;

const Line = styled.div<{ $self: boolean }>`
  b {
    color: ${(p) => (p.$self ? '#a40000' : '#00009c')};
  }
  small {
    color: #999;
    margin-left: 6px;
    font-size: 11px;
  }
`;

const SELF = 'SunflwrC81';

export function BuddyLine({ props }: AppWindowProps) {
  const { send, contentEpoch } = useGame();
  const [buddies, setBuddies] = useState<BuddyView[]>([]);
  const [convo, setConvo] = useState<ItemContent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestedConvo = props.conversationId as string | undefined;

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'getBuddies' }).then((res) => {
      if (!cancelled && res.type === 'buddies') setBuddies(res.buddies);
    });
    return () => {
      cancelled = true;
    };
  }, [send, contentEpoch]);

  useEffect(() => {
    if (requestedConvo) void openConvo(requestedConvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedConvo]);

  const openConvo = async (conversationId: string) => {
    setNotice(null);
    const res = await send({ type: 'open', itemId: conversationId });
    if (res.type === 'open' && res.ok && res.item) {
      setConvo(res.item);
    } else {
      setConvo(null);
      setNotice('No saved conversations with this buddy.');
    }
  };

  const onBuddyClick = (b: BuddyView) => {
    if (b.conversationId) void openConvo(b.conversationId);
    else {
      setConvo(null);
      setNotice(`No saved conversations with ${b.screenname}.`);
    }
  };

  const groups = [...new Set(buddies.map((b) => b.group))];

  return (
    <>
      <div style={{ fontSize: 12, padding: '0 2px 4px', color: '#444' }}>
        Signed on as <b>{SELF}</b> — saved logs only (not connected)
      </div>
      <Layout>
        <ListPane>
          {groups.map((g) => (
            <div key={g}>
              <GroupHead>{g}</GroupHead>
              {buddies
                .filter((b) => b.group === g)
                .map((b) => (
                  <BuddyRow
                    key={b.screenname}
                    $offline={b.status === 'offline'}
                    title={
                      b.status === 'away'
                        ? `Away: ${b.awayMessage ?? ''}`
                        : b.status === 'offline'
                          ? 'Offline'
                          : 'Online'
                    }
                    onDoubleClick={() => onBuddyClick(b)}
                  >
                    {b.screenname}
                    {b.alias ? ` (${b.alias})` : ''}
                    {b.status === 'away' ? ' ⏾' : ''}
                  </BuddyRow>
                ))}
            </div>
          ))}
        </ListPane>
        <ChatPane>
          <LogInfo>
            {convo
              ? `Saved log — ${convo.meta?.screenname} — ${convo.meta?.logDate ?? ''}`
              : 'Double-click a buddy to view saved logs.'}
          </LogInfo>
          <Messages>
            {notice && <div style={{ color: '#777' }}>{notice}</div>}
            {convo?.body?.messages?.map((m, i) => (
              <Line key={i} $self={m.from === SELF}>
                <b>{m.from}:</b> {m.text}
                <small>{m.at}</small>
              </Line>
            ))}
          </Messages>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexShrink: 0 }}>
            <TextInput
              disabled
              placeholder="BuddyLine is not connected."
              style={{ flex: 1 }}
            />
          </div>
        </ChatPane>
      </Layout>
    </>
  );
}
