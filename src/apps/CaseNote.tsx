/**
 * Case Note — the Case Files note editor in its own window. Notepad-shaped,
 * but wearing the case software's uniform: the black->teal title bar (via
 * the registry titleBar param — every Case Files window carries it) and
 * Arial content, like the rest of the app's reading surfaces. New notes and
 * edits both come through here; nothing is written until Save.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, TextInput } from 'react95';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Wrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: Arial, Helvetica, sans-serif;
`;

const Paper = styled.textarea`
  flex: 1;
  min-height: 0;
  resize: none;
  border: 2px inset #888;
  background: #fff;
  padding: 8px 10px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  user-select: text;
  outline: none;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
`;

/** Open a Case Note window — one per document (an existing note refocuses
 * its window; a new note always gets a fresh one). */
export function openCaseNote(opts: { docId?: string; name?: string } = {}): void {
  const st = useWindowStore.getState();
  if (opts.docId) {
    const existing = st.windows.find(
      (w) => w.appId === 'casenote' && w.props.docId === opts.docId,
    );
    if (existing) {
      st.focus(existing.id);
      return;
    }
  }
  st.open('casenote', {
    title: opts.docId ? `${opts.name ?? 'Note'} - Case Note` : 'New Note - Case Note',
    props: { ...opts },
  });
}

export function CaseNote({ windowId, props }: AppWindowProps) {
  const { send } = useGame();
  const close = useWindowStore((s) => s.close);
  const setTitle = useWindowStore((s) => s.setTitle);
  const docId = props.docId as string | undefined;

  const [name, setName] = useState((props.name as string) ?? 'New Note.txt');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  // An existing note loads its current content; a new one starts blank.
  useEffect(() => {
    if (!docId) return;
    let canceled = false;
    void send({ type: 'open', itemId: docId }).then((res) => {
      if (canceled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setName(res.item.name);
        setText(res.item.body?.text ?? '');
        setTitle(windowId, `${res.item.name} - Case Note`);
      } else {
        setStatus('This note could not be opened.');
      }
    });
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus('Enter a file name.');
      return;
    }
    const res = await send({
      type: 'saveDocument',
      docId,
      name: trimmed,
      text,
      ...(docId ? {} : { folderId: 'casefile' }),
    });
    if (res.type === 'document' && res.ok) close(windowId);
    else {
      setStatus(
        res.type === 'document' && res.error === 'too_many'
          ? 'The Case Files workspace is full.'
          : 'Save failed.',
      );
    }
  };

  return (
    <Wrap>
      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      />
      <Paper value={text} spellCheck={false} autoFocus onChange={(e) => setText(e.target.value)} />
      <ButtonRow>
        {status && <span style={{ fontSize: 12, color: '#802020', marginRight: 'auto' }}>{status}</span>}
        <Button onClick={() => void save()} style={{ width: 80 }}>
          Save
        </Button>
        <Button onClick={() => close(windowId)} style={{ width: 80 }}>
          Cancel
        </Button>
      </ButtonRow>
    </Wrap>
  );
}
