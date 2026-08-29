import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, TextInput } from 'react95';
import type { BuddyView, ChatView, ItemContent } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import type { AppWindowProps } from '../os/appRegistry';
import { playImMsg, playError } from '../os/sounds';
import { OfflineAlert } from '../os/OfflineAlert';

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
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Messages = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  padding: 6px 8px;
  font-size: 14px;
  user-select: text;
  line-height: 1.55;
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

const SystemLine = styled.div`
  color: #777;
  font-style: italic;
  margin-top: 4px;
`;

const PromptWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 3px;
  flex-shrink: 0;
`;

const PromptBtn = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 3px 6px;
  font-size: 13px;
  cursor: default;
  color: #000080;
  &:hover {
    background: #000080;
    color: #fff;
  }
`;

const REVEAL_MS = 550; // constant step between incoming lines — no easing

export function BuddyLine({ props }: AppWindowProps) {
  const { send, view, contentEpoch, setShowEndCard } = useGame();
  const [buddies, setBuddies] = useState<BuddyView[]>([]);
  const [convo, setConvo] = useState<ItemContent | null>(null); // saved log
  const [chat, setChat] = useState<ChatView | null>(null); // live conversation
  const [visible, setVisible] = useState(0); // stepped message reveal
  const [notice, setNotice] = useState<string | null>(null);
  const [offlineAlert, setOfflineAlert] = useState(false);
  const [activeBuddy, setActiveBuddy] = useState<BuddyView | null>(null);
  const requestedConvo = props.conversationId as string | undefined;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const self = view?.imScreenname ?? 'me';

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'getBuddies' }).then((res) => {
      if (!cancelled && res.type === 'buddies') setBuddies(res.buddies);
    });
    return () => {
      cancelled = true;
    };
  }, [send, contentEpoch]);

  // Incoming lines arrive one at a time, on a fixed clock.
  useEffect(() => {
    if (!chat || visible >= chat.messages.length) return;
    const t = window.setTimeout(() => {
      setVisible((v) => v + 1);
      playImMsg();
    }, REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [chat, visible]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [visible, convo]);

  // The sting: once the sign-off has fully played out after the season's end,
  // the card arrives. Once only — closing it must not summon it back.
  const cardFiredRef = useRef(false);
  useEffect(() => {
    if (cardFiredRef.current) return;
    if (!chat?.signedOff || visible < chat.messages.length || !view?.ended) return;
    cardFiredRef.current = true;
    const t = window.setTimeout(() => setShowEndCard(true), 2600);
    return () => window.clearTimeout(t);
  }, [chat, visible, view, setShowEndCard]);

  useEffect(() => {
    if (requestedConvo) void openLog(requestedConvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedConvo]);

  const openLog = async (conversationId: string) => {
    setNotice(null);
    setChat(null);
    const res = await send({ type: 'open', itemId: conversationId });
    if (res.type === 'open' && res.ok && res.item) {
      setConvo(res.item);
    } else {
      setConvo(null);
      setNotice('No saved conversations with this buddy.');
    }
  };

  const openLive = async (b: BuddyView): Promise<boolean> => {
    const res = await send({ type: 'getConversation', screenname: b.screenname });
    if (res.type === 'chat' && res.ok && res.chat) {
      setNotice(null);
      setConvo(null);
      setChat(res.chat);
      // A conversation already underway shows its history at once; only a
      // first contact steps the opener in line by line.
      const talkedBefore = res.chat.messages.some((m) => m.from === self);
      setVisible(talkedBefore ? res.chat.messages.length : 0);
      return true;
    }
    return false;
  };

  const onBuddyClick = async (b: BuddyView) => {
    setActiveBuddy(b);
    if (b.canChat && (await openLive(b))) return;
    if (b.conversationId) {
      // Saved logs are on the disk — they read fine offline.
      void openLog(b.conversationId);
      return;
    }
    if (!view?.online) {
      // Nothing local for this buddy and no line to reach them on.
      playError();
      setOfflineAlert(true);
      return;
    }
    setChat(null);
    setConvo(null);
    setNotice(
      b.status === 'offline'
        ? `${b.screenname} is offline and cannot receive messages.`
        : `No saved conversations with ${b.screenname}.`,
    );
  };

  const sayPrompt = async (promptId: string) => {
    if (!chat) return;
    const prevLen = chat.messages.length;
    const res = await send({ type: 'say', screenname: chat.screenname, promptId });
    if (res.type === 'chat' && res.ok && res.chat) {
      setChat(res.chat);
      setVisible(prevLen + 1); // your own line lands instantly; replies step in
      if (res.chat.signedOff) {
        // Presence changed server-side — show the roster the truth.
        const roster = await send({ type: 'getBuddies' });
        if (roster.type === 'buddies') setBuddies(roster.buddies);
      }
    }
  };

  const groups = [...new Set(buddies.map((b) => b.group))];
  const fullyRevealed = !!chat && visible >= chat.messages.length;
  const liveStatus =
    activeBuddy && chat
      ? activeBuddy.status === 'away'
        ? 'away'
        : 'online'
      : '';

  return (
    <>
      <div style={{ fontSize: 12, padding: '0 2px 4px', color: '#444' }}>
        {view?.online ? (
          <>Signed on as <b>{self}</b></>
        ) : (
          <>Not connected — saved logs only. Dial in to see who&apos;s online.</>
        )}
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
                    onDoubleClick={() => void onBuddyClick(b)}
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
            <span style={{ flex: 1 }}>
              {chat
                ? `${chat.screenname} — ${liveStatus}`
                : convo
                  ? `Saved log — ${convo.meta?.screenname} — ${convo.meta?.logDate ?? ''}`
                  : 'Double-click a buddy to send a message.'}
            </span>
            {chat && activeBuddy?.conversationId && (
              <Button size="sm" onClick={() => void openLog(activeBuddy.conversationId!)}>
                Saved Log
              </Button>
            )}
            {convo && activeBuddy?.canChat && (
              <Button size="sm" onClick={() => void openLive(activeBuddy)}>
                Back to Chat
              </Button>
            )}
          </LogInfo>
          <Messages>
            {notice && <div style={{ color: '#777' }}>{notice}</div>}
            {convo?.body?.messages?.map((m, i) => (
              <Line key={i} $self={m.from === self}>
                <b>{m.from}:</b> {m.text}
                <small>{m.at}</small>
              </Line>
            ))}
            {chat?.messages.slice(0, visible).map((m, i) => (
              <Line key={i} $self={m.from === self}>
                <b>{m.from}:</b> {m.text}
                <small>{m.at}</small>
              </Line>
            ))}
            {chat?.signedOff && fullyRevealed && (
              <SystemLine>{chat.screenname} has signed off.</SystemLine>
            )}
            <div ref={bottomRef} />
          </Messages>
          {chat && !chat.signedOff && fullyRevealed && chat.prompts.length > 0 ? (
            <PromptWell>
              {chat.prompts.map((p) => (
                <PromptBtn key={p.id} onClick={() => void sayPrompt(p.id)}>
                  {p.text}
                </PromptBtn>
              ))}
            </PromptWell>
          ) : (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexShrink: 0 }}>
              <TextInput
                disabled
                placeholder={
                  chat && !chat.signedOff
                    ? fullyRevealed
                      ? 'Nothing more to say right now.'
                      : ''
                    : 'BuddyLine — choose a buddy.'
                }
                style={{ flex: 1 }}
              />
            </div>
          )}
        </ChatPane>
      </Layout>
      {offlineAlert && (
        <OfflineAlert
          title="Chat"
          message="Chat could not sign on to BuddyLine because this computer is not connected to the Internet. Would you like to connect now?"
          onClose={() => setOfflineAlert(false)}
        />
      )}
    </>
  );
}
