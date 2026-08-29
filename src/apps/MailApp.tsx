import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, ScrollView, Toolbar } from 'react95';
import type { ItemContent, ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';
import { Icon } from '../os/icons';

const MAILBOXES = [
  { id: 'mailbox.inbox', name: 'Inbox', icon: 'mailbox' },
  { id: 'mailbox.sent', name: 'Sent', icon: 'mailbox' },
  { id: 'mailbox.deleted', name: 'Deleted', icon: 'mailbox-trash' },
];

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 140px 1fr;
  grid-template-rows: 200px 1fr;
  gap: 4px;
  margin-top: 4px;
`;

const BoxList = styled(Frame).attrs({ variant: 'well' })`
  grid-row: 1 / 3;
  padding: 4px;
  overflow: auto;
`;

const BoxRow = styled.button<{ $active: boolean }>`
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  border: none;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : 'inherit')};
  padding: 4px 6px;
  cursor: default;
  font-size: 13px;
`;

const MsgTable = styled.div`
  background: #fff;
  font-size: 13px;
  user-select: none;
`;

const MsgRow = styled.button<{ $active: boolean; $unread: boolean }>`
  display: grid;
  grid-template-columns: 1.1fr 1.6fr 108px;
  width: 100%;
  border: none;
  text-align: left;
  padding: 3px 6px;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : 'inherit')};
  font-weight: ${(p) => (p.$unread ? 'bold' : 'normal')};
  font-size: 13px;
  cursor: default;
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const HeadRow = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1.6fr 108px;
  padding: 3px 6px;
  background: #d4d0c8;
  border-bottom: 1px solid #888;
  font-weight: bold;
  font-size: 12px;
  position: sticky;
  top: 0;
`;

const Reading = styled(Frame).attrs({ variant: 'field' })`
  background: #fff;
  overflow: auto;
  padding: 8px 10px;
  user-select: text;
  font-size: 14px;
`;

const Headers = styled.div`
  border-bottom: 1px solid #ccc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  font-size: 13px;
  color: #333;
`;

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${d
    .getHours()
    .toString()
    .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function MailApp() {
  const { send, view, contentEpoch } = useGame();
  const [mailbox, setMailbox] = useState('mailbox.inbox');
  const [messages, setMessages] = useState<ItemSummary[]>([]);
  const [openMsg, setOpenMsg] = useState<ItemContent | null>(null);
  const [status, setStatus] = useState('Connected to westwind.net — session cached');

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'listChildren', parentId: mailbox }).then((res) => {
      if (cancelled || res.type !== 'children') return;
      const sorted = [...res.items].sort((a, b) =>
        (b.meta?.date ?? '').localeCompare(a.meta?.date ?? ''),
      );
      setMessages(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, [mailbox, send, contentEpoch]);

  const openMessage = async (id: string) => {
    const res = await send({ type: 'open', itemId: id });
    if (res.type === 'open' && res.ok && res.item) setOpenMsg(res.item);
  };

  const checkMail = () => {
    setStatus('Dialing… no answer from mail server. Working offline.');
    window.setTimeout(() => setStatus('No new messages.'), 1600);
  };

  const openedSet = new Set(view?.opened ?? []);

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button onClick={checkMail}>Check Mail</Button>
        <Button disabled>Compose</Button>
        <Button disabled>Reply</Button>
        <span style={{ fontSize: 12, marginLeft: 'auto', color: '#444' }}>
          casey_b@westwind.net
        </span>
      </Toolbar>
      <Layout>
        <BoxList>
          {MAILBOXES.map((b) => (
            <BoxRow key={b.id} $active={mailbox === b.id} onClick={() => setMailbox(b.id)}>
              <Icon name={b.icon} size={18} />
              {b.name}
            </BoxRow>
          ))}
        </BoxList>
        <ScrollView style={{ background: '#fff', minHeight: 0 }}>
          <MsgTable>
            <HeadRow>
              <span>From</span>
              <span>Subject</span>
              <span>Date</span>
            </HeadRow>
            {messages.map((m) => (
              <MsgRow
                key={m.id}
                $active={openMsg?.id === m.id}
                $unread={!openedSet.has(m.id) && mailbox === 'mailbox.inbox'}
                onClick={() => void openMessage(m.id)}
              >
                <span>{(m.meta?.from ?? '').replace(/<.*>/, '').trim() || m.meta?.from}</span>
                <span>{m.name}</span>
                <span>{fmtDate(m.meta?.date)}</span>
              </MsgRow>
            ))}
            {messages.length === 0 && <div style={{ padding: 10, color: '#777' }}>(no messages)</div>}
          </MsgTable>
        </ScrollView>
        <Reading>
          {openMsg ? (
            <>
              <Headers>
                <div>
                  <b>From:</b> {openMsg.meta?.from}
                </div>
                <div>
                  <b>To:</b> {openMsg.meta?.to}
                </div>
                <div>
                  <b>Subject:</b> {openMsg.name}
                </div>
                <div>
                  <b>Date:</b> {fmtDate(openMsg.meta?.date)}
                </div>
              </Headers>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: PIXEL_MONO, fontSize: 16, lineHeight: 1.45 }}>
                {openMsg.body?.text}
              </div>
            </>
          ) : (
            <span style={{ color: '#777' }}>Select a message to read it.</span>
          )}
        </Reading>
      </Layout>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {status}
      </Frame>
    </>
  );
}
