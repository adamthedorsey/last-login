/**
 * Case File — the evidence viewer the sheriff's office installed before
 * handing over the keyboard. The one diegetic channel between the player
 * and the case handler: it explains why we're at this machine and reacts
 * to progress.
 *
 * EVERY string it displays (title, memos, names) is engine-served handler
 * content — this file is pure chrome. New memos appear as discoveries
 * land (contentEpoch refetch).
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import type { CaseFileView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { DOC_TEXT } from '../theme';

const SEEN_KEY = 'lastlogin.casefile.seen';

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

const TitleBand = styled(Frame).attrs({ variant: 'well' })`
  padding: 4px 8px;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 4px;
  margin-top: 4px;
`;

const MemoList = styled(Frame).attrs({ variant: 'well' })`
  overflow: auto;
  padding: 4px;
`;

const MemoRow = styled.button<{ $active: boolean; $unread: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : 'inherit')};
  padding: 3px 6px;
  font-size: 13px;
  font-weight: ${(p) => (p.$unread ? 'bold' : 'normal')};
  cursor: var(--cursor-arrow);
  span {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  small {
    font-weight: normal;
    opacity: 0.7;
  }
`;

const Reading = styled(Frame).attrs({ variant: 'field' })`
  background: #fff;
  overflow: auto;
  padding: 10px 14px;
  user-select: text;
  ${DOC_TEXT}
  white-space: pre-wrap;
`;

const MemoHead = styled.div`
  border-bottom: 1px solid #ccc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  font-weight: bold;
`;

export function CaseFile() {
  const { send, contentEpoch } = useGame();
  const [file, setFile] = useState<CaseFileView | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>(loadSeen);

  const markSeen = (id: string) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* per-player convenience only */
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'getCaseFile' }).then((res) => {
      if (cancelled || res.type !== 'casefile') return;
      setFile(res.view);
      // Newest memo opens by default the first time it exists.
      setOpenId((prev) => {
        const id = prev ?? res.view.messages[res.view.messages.length - 1]?.id ?? null;
        if (id) markSeen(id);
        return id;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [send, contentEpoch]);

  const open = file?.messages.find((m) => m.id === openId) ?? null;

  return (
    <>
      <TitleBand>{file?.title ?? '...'}</TitleBand>
      <Layout>
        <MemoList>
          {(file?.messages ?? [])
            .slice()
            .reverse()
            .map((m) => (
              <MemoRow
                key={m.id}
                $active={m.id === openId}
                $unread={!seen.includes(m.id)}
                onClick={() => {
                  setOpenId(m.id);
                  markSeen(m.id);
                }}
              >
                <span>{m.subject ?? '(no subject)'}</span>
                <small>{m.date ?? ''}</small>
              </MemoRow>
            ))}
          {file && file.messages.length === 0 && (
            <div style={{ padding: 8, color: '#777', fontSize: 13 }}>(no memos on file)</div>
          )}
        </MemoList>
        <Reading>
          {open ? (
            <>
              <MemoHead>
                {open.from ? `FROM: ${open.from}\n` : ''}
                {open.date ? `DATE: ${open.date}\n` : ''}
                RE: {open.subject ?? '(no subject)'}
              </MemoHead>
              {open.text}
            </>
          ) : (
            <span style={{ color: '#777' }}>Select a memo.</span>
          )}
        </Reading>
      </Layout>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {file ? `${file.messages.length} memo(s) on file` : 'Opening case file ...'}
      </Frame>
    </>
  );
}
