import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, Separator, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Paper = styled.textarea`
  flex: 1;
  min-height: 0;
  resize: none;
  border: 2px inset #888;
  background: #fff;
  padding: 8px 10px;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  white-space: pre-wrap;
  user-select: text;
  line-height: 1.45;
  outline: none;
  &:read-only {
    background: #f4f4ee;
  }
`;

const MenuRow = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  position: relative;
  padding-bottom: 2px;
`;

const MenuButton = styled.button<{ $open: boolean }>`
  border: none;
  background: ${(p) => (p.$open ? '#000080' : 'transparent')};
  color: ${(p) => (p.$open ? '#fff' : 'inherit')};
  padding: 2px 8px;
  font-size: 13px;
  cursor: default;
`;

const Drop = styled(MenuList)`
  position: absolute;
  top: 20px;
  left: 0;
  z-index: 5000;
  min-width: 160px;
  font-size: 13px;
`;

const StatusBar = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 12px;
  flex-shrink: 0;
`;

const DialogOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  z-index: 10;
`;

export function Notepad({ windowId, props }: AppWindowProps) {
  const { send } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const itemId = props.itemId as string | undefined;

  const [text, setText] = useState('');
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState('untitled.txt');
  const [readOnly, setReadOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('New file');
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('untitled.txt');
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemId) {
      setStatus('New file');
      return;
    }
    let cancelled = false;
    void send({ type: 'open', itemId }).then((res) => {
      if (cancelled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setText(res.item.body?.text ?? '');
        if (res.item.editable) {
          setDocId(res.item.id);
          setDocName(res.item.name);
          setStatus(`${res.item.name} — your file`);
        } else {
          setReadOnly(true);
          const m = res.item.meta;
          setStatus(
            ['Write-protected file', m?.modifiedAt ? `modified ${m.modifiedAt}` : null, m?.deletedAt ? `deleted ${m.deletedAt}` : null]
              .filter(Boolean)
              .join(' — '),
          );
        }
      } else {
        setError('Notepad cannot open this file.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [itemId, send]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  const doSave = async (name: string, id: string | null) => {
    const res = await send({ type: 'saveDocument', docId: id ?? undefined, name, text });
    if (res.type === 'document' && res.ok && res.item) {
      setDocId(res.item.id);
      setDocName(res.item.name);
      setDirty(false);
      setStatus(`Saved to Desktop — ${res.item.name}`);
      setTitle(windowId, `${res.item.name} - Notepad`);
    } else {
      setStatus(
        res.type === 'document' && res.error === 'too_many'
          ? 'Cannot save: too many files on the desktop.'
          : 'Save failed.',
      );
    }
  };

  const onSave = () => {
    setMenuOpen(false);
    if (docId) void doSave(docName, docId);
    else {
      setSaveAsName(docName);
      setSaveAsOpen(true);
    }
  };

  const onSaveAs = () => {
    setMenuOpen(false);
    setSaveAsName(docName);
    setSaveAsOpen(true);
  };

  const onNew = () => {
    setMenuOpen(false);
    setText('');
    setDocId(null);
    setDocName('untitled.txt');
    setDirty(false);
    setReadOnly(false);
    setStatus('New file');
    setTitle(windowId, 'Notepad');
  };

  if (error) return <div style={{ padding: 12 }}>{error}</div>;

  return (
    <>
      <MenuRow ref={menuRef}>
        <MenuButton
          $open={menuOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMenuOpen((v) => !v)}
        >
          File
        </MenuButton>
        {menuOpen && (
          <Drop>
            <MenuListItem size="sm" onClick={onNew}>
              New
            </MenuListItem>
            <MenuListItem size="sm" disabled={readOnly} onClick={readOnly ? undefined : onSave}>
              Save
            </MenuListItem>
            <MenuListItem size="sm" disabled={readOnly} onClick={readOnly ? undefined : onSaveAs}>
              Save As...
            </MenuListItem>
            <Separator />
            <MenuListItem size="sm" onClick={() => setMenuOpen(false)}>
              (that's the whole menu)
            </MenuListItem>
          </Drop>
        )}
      </MenuRow>
      <Paper
        value={text}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
      />
      <StatusBar>
        {status}
        {dirty && !readOnly ? ' *' : ''}
      </StatusBar>

      {saveAsOpen && (
        <DialogOverlay>
          <Window style={{ width: 300 }}>
            <WindowHeader>Save As</WindowHeader>
            <WindowContent>
              <div style={{ fontSize: 13, marginBottom: 6 }}>File name (saves to Desktop):</div>
              <TextInput
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveAsName.trim()) {
                    setSaveAsOpen(false);
                    void doSave(saveAsName.trim(), docId);
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                <Button onClick={() => setSaveAsOpen(false)}>Cancel</Button>
                <Button
                  disabled={!saveAsName.trim()}
                  onClick={() => {
                    setSaveAsOpen(false);
                    void doSave(saveAsName.trim(), docId);
                  }}
                >
                  Save
                </Button>
              </div>
            </WindowContent>
          </Window>
        </DialogOverlay>
      )}
    </>
  );
}
