import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, ScrollView, Toolbar } from 'react95';
import type { ItemContent, ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { playError } from '../os/sounds';
import { OfflineAlert } from '../os/OfflineAlert';
import { Icon } from '../os/icons';
import { launchItem } from '../os/launch';

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
  /* rows come inline: list height is the draggable splitter's state */
  gap: 0 4px;
  margin-top: 4px;
`;

const BoxList = styled(Frame).attrs({ variant: 'well' })`
  grid-row: 1 / 4;
  padding: 4px;
  overflow: auto;
`;

/** The Outlook-Express splitter between the list and the reading pane. */
const Splitter = styled.div`
  grid-column: 2;
  cursor: ns-resize;
  /* a slim grab strip; the visual bar is the panes' own bevels */
  touch-action: none;
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
  cursor: var(--cursor-arrow);
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
  cursor: var(--cursor-arrow);
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

/** The attachment shelf, Outlook-Express style: icon chips under the
 * headers. Double-click opens one in its viewer. */
const AttachRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

const AttachChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #999;
  background: #ececec;
  padding: 2px 8px 2px 4px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  font-weight: normal;
  color: #222;
  cursor: var(--cursor-arrow);
  user-select: none;
  &:active {
    border-style: inset;
  }
`;

/** Same face as the letter body, all bold — the envelope, set apart. */
const Headers = styled.div`
  border-bottom: 1px solid #ccc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  font-weight: bold;
  color: #333;
`;

/**
 * Letter bodies read in Arial — what Outlook Express actually used in 1997,
 * and the comfortable long-form face. Aliased like everything else; the
 * bitmap chrome font stays on lists and headers, where it's short and crisp.
 */
const BodyText = styled.div`
  white-space: pre-wrap;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.6;
`;

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h12 = d.getHours() % 12 || 12;
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${h12}:${mm} ${ampm}`;
}

export function MailApp() {
  const { send, view, contentEpoch } = useGame();
  const [mailbox, setMailbox] = useState('mailbox.inbox');
  // The list/reading splitter: plain per-session state, dragged live.
  const [listHeight, setListHeight] = useState(200);
  const splitDrag = useRef<{ startY: number; startH: number } | null>(null);
  const [messages, setMessages] = useState<ItemSummary[]>([]);
  const [openMsg, setOpenMsg] = useState<ItemContent | null>(null);
  const [attachments, setAttachments] = useState<ItemSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [offlineAlert, setOfflineAlert] = useState(false);

  useEffect(() => {
    let canceled = false;
    void send({ type: 'listChildren', parentId: mailbox }).then((res) => {
      if (canceled || res.type !== 'children') return;
      const sorted = [...res.items].sort((a, b) =>
        (b.meta?.date ?? '').localeCompare(a.meta?.date ?? ''),
      );
      setMessages(sorted);
    });
    return () => {
      canceled = true;
    };
  }, [mailbox, send, contentEpoch]);

  const openMessage = async (id: string) => {
    const res = await send({ type: 'open', itemId: id });
    if (res.type !== 'open' || !res.ok || !res.item) return;
    setOpenMsg(res.item);
    // Attachments are the mail's child items — the engine gates them with
    // the message itself, so this can never show more than the mail did.
    setAttachments([]);
    const kids = await send({ type: 'listChildren', parentId: id });
    if (kids.type === 'children') setAttachments(kids.items);
  };

  const online = view?.online === true;

  const checkMail = async () => {
    if (!online) {
      // The Win95 way: a proper scold, with the fix one click away.
      playError();
      setOfflineAlert(true);
      return;
    }
    setStatus('Checking for new messages ...');
    const res = await send({ type: 'checkMail' });
    if (res.type === 'net' && (res.newMail ?? 0) > 0) {
      setStatus(`You have ${res.newMail} new message(s).`);
    } else {
      setStatus('No new messages.');
    }
  };

  const openedSet = new Set(view?.opened ?? []);

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button onClick={() => void checkMail()}>Check Mail</Button>
        <Button disabled>Compose</Button>
        <Button disabled>Reply</Button>
        <Button
          disabled={!openMsg}
          title="Save a copy of this message with your own files"
          onClick={() => {
            if (!openMsg) return;
            void send({ type: 'copyItem', itemId: openMsg.id }).then((res) => {
              setStatus(
                res.type === 'document' && res.ok && res.item
                  ? `Saved to Case Files as "${res.item.name}"`
                  : 'This message cannot be copied.',
              );
            });
          }}
        >
          Save to Case Files
        </Button>
        <span style={{ fontSize: 12, marginLeft: 'auto', color: '#444' }}>
          casey_t@westwind.net
        </span>
      </Toolbar>
      <Layout style={{ gridTemplateRows: `${listHeight}px 6px 1fr` }}>
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
        <Splitter
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            splitDrag.current = { startY: e.clientY, startH: listHeight };
          }}
          onPointerMove={(e) => {
            const d = splitDrag.current;
            if (!d) return;
            const box = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
            const max = Math.max(80, box.height - 120);
            setListHeight(Math.min(max, Math.max(60, d.startH + (e.clientY - d.startY))));
          }}
          onPointerUp={() => {
            splitDrag.current = null;
          }}
        />
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
                {attachments.length > 0 && (
                  <AttachRow>
                    <b>Attach:</b>
                    {attachments.map((a) => (
                      <AttachChip
                        key={a.id}
                        title="Double-click to open"
                        onDoubleClick={() => launchItem(a)}
                      >
                        <Icon name={a.icon ?? 'doc'} size={16} />
                        {a.name}
                        {a.meta?.sizeKb ? ` (${a.meta.sizeKb}KB)` : ''}
                      </AttachChip>
                    ))}
                  </AttachRow>
                )}
              </Headers>
              <BodyText>{openMsg.body?.text}</BodyText>
            </>
          ) : (
            <span style={{ color: '#777' }}>Select a message to read it.</span>
          )}
        </Reading>
      </Layout>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {status ?? (online ? 'Connected to westwind.net' : 'Working offline — downloaded mail only.')}
      </Frame>

      {offlineAlert && (
        <OfflineAlert
          title="Mail"
          message="Mail could not check for new messages because this computer is not connected to the Internet. Would you like to connect now?"
          onClose={() => setOfflineAlert(false)}
        />
      )}
    </>
  );
}
