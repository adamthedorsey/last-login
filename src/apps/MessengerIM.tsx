/**
 * A Messenger IM window — one per buddy, like AIM. It shows a live
 * BuddyLine conversation (server-authored prompt tree; the player never
 * types free text, they pick a line) or a saved log read from disk. All
 * content and gating stays server-side; this is just the AIM-shaped
 * conversation surface.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import type { ChatView, ItemContent } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import { playImMsg } from '../os/sounds';
import type { AppWindowProps } from '../os/appRegistry';

const Wrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

/** The read-back pane — Arial, like AIM's proportional message area. */
const Messages = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  padding: 6px 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  user-select: text;
  line-height: 1.5;
`;

const Line = styled.div<{ $self: boolean }>`
  margin-bottom: 2px;
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

/** The prompt tray: the lines the player may say right now. AIM had a
 * free-text box here; ours offers authored choices (no free input). */
const PromptWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 3px;
  flex-shrink: 0;
  max-height: 132px;
  overflow: auto;
`;

const PromptBtn = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 4px 6px;
  font-size: 13px;
  cursor: var(--cursor-arrow);
  color: #000080;
  &:hover {
    background: #000080;
    color: #fff;
  }
`;

const DeadBox = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 6px 8px;
  flex-shrink: 0;
  color: #777;
  font-size: 13px;
`;

const REVEAL_MS = 550; // constant step between incoming lines — no easing

export function MessengerIM({ windowId, props }: AppWindowProps) {
  const { send, view, contentEpoch, setShowEndCard } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const screenname = props.screenname as string | undefined;
  const logItemId = props.logItemId as string | undefined;

  const [chat, setChat] = useState<ChatView | null>(null);
  const [log, setLog] = useState<ItemContent | null>(null);
  const [visible, setVisible] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const self = view?.imScreenname ?? 'me';
  const fromWire = props.fromWire === true;

  const trailingIncoming = (msgs: ChatView['messages']): number => {
    let n = 0;
    for (let i = msgs.length - 1; i >= 0 && msgs[i].from !== self; i--) n++;
    return n;
  };

  // Initial load: a live conversation or a saved log.
  useEffect(() => {
    let canceled = false;
    if (logItemId) {
      void send({ type: 'open', itemId: logItemId }).then((res) => {
        if (canceled) return;
        if (res.type === 'open' && res.ok && res.item) {
          setLog(res.item);
          setTitle(windowId, `${res.item.meta?.screenname ?? 'Saved'} - Conversation`);
        } else {
          setNote('This conversation could not be opened.');
        }
      });
    } else if (screenname) {
      void send({ type: 'getConversation', screenname }).then((res) => {
        if (canceled) return;
        if (res.type === 'chat' && res.ok && res.chat) {
          setChat(res.chat);
          const talkedBefore = res.chat.messages.some((m) => m.from === self);
          if (fromWire) {
            setVisible(res.chat.messages.length - trailingIncoming(res.chat.messages));
          } else {
            setVisible(talkedBefore ? res.chat.messages.length : 0);
          }
        } else {
          setNote(`No conversation with ${screenname} right now.`);
        }
      });
    }
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [visible, log]);

  // Scheduled events can add lines mid-chat; refetch on content shift.
  useEffect(() => {
    if (!chat || !screenname) return;
    let canceled = false;
    void send({ type: 'getConversation', screenname }).then((res) => {
      if (canceled || res.type !== 'chat' || !res.ok || !res.chat) return;
      if (res.chat.messages.length > chat.messages.length) setChat(res.chat);
    });
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEpoch]);

  // The end-of-season sting: after the final sign-off finishes playing.
  const cardFiredRef = useRef(false);
  useEffect(() => {
    if (cardFiredRef.current) return;
    if (!chat?.signedOff || visible < chat.messages.length || !view?.ended) return;
    cardFiredRef.current = true;
    const t = window.setTimeout(() => setShowEndCard(true), 2600);
    return () => window.clearTimeout(t);
  }, [chat, visible, view, setShowEndCard]);

  const say = async (promptId: string) => {
    if (!chat || !screenname) return;
    const prevLen = chat.messages.length;
    const res = await send({ type: 'say', screenname, promptId });
    if (res.type === 'chat' && res.ok && res.chat) {
      setChat(res.chat);
      setVisible(prevLen + 1); // your line lands instantly; replies step in
    }
  };

  const fullyRevealed = !!chat && visible >= chat.messages.length;
  const shownMessages = log?.body?.messages ?? chat?.messages.slice(0, visible) ?? [];

  return (
    <Wrap>
      <Messages>
        {note && <div style={{ color: '#777' }}>{note}</div>}
        {shownMessages.map((m, i) => (
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
            <PromptBtn key={p.id} onClick={() => void say(p.id)}>
              {p.text}
            </PromptBtn>
          ))}
        </PromptWell>
      ) : (
        <DeadBox>
          {log
            ? 'Saved conversation — read only.'
            : chat?.signedOff
              ? `${chat.screenname} is offline.`
              : chat && !fullyRevealed
                ? ' '
                : 'Nothing more to say right now.'}
        </DeadBox>
      )}
    </Wrap>
  );
}
