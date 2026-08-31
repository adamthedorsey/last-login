import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, Separator, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import { useGame } from '../game/gameContext';
import { DOC_MONO, DOC_TEXT } from '../theme';
import { useWindowStore } from '../os/windowStore';
import { CloseGlyph, TitleBarButton } from '../os/glyphs';
import { fmtShortStamp } from '../os/fileTypes';
import type { AppWindowProps } from '../os/appRegistry';

const Paper = styled.textarea<{ $mono: boolean }>`
  flex: 1;
  min-height: 0;
  resize: none;
  border: 2px inset #888;
  background: #fff;
  padding: 8px 10px;
  ${(p) => (p.$mono ? DOC_MONO : DOC_TEXT)}
  white-space: pre-wrap;
  user-select: text;
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
  cursor: var(--cursor-arrow);
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

/** Win95 Notepad's Time/Date stamp: "2:31 AM 10/11/1997", straight from the
 * frozen in-world clock string (never the player's real clock). */
function timeDateStamp(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const hh = Number(iso.slice(11, 13));
  const mm = iso.slice(14, 16);
  return `${hh % 12 || 12}:${mm} ${hh >= 12 ? 'PM' : 'AM'} ${m}/${d}/${y}`;
}

type MenuName = 'file' | 'edit' | 'search' | null;

export function Notepad({ windowId, props }: AppWindowProps) {
  const { send, view } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const itemId = props.itemId as string | undefined;

  const [text, setText] = useState('');
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState('untitled.txt');
  const [readOnly, setReadOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('New file');
  const [menuOpen, setMenuOpen] = useState<MenuName>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('untitled.txt');
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [mono, setMono] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [findMiss, setFindMiss] = useState<string | null>(null);
  const paperRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemId) {
      setStatus('New file');
      return;
    }
    let canceled = false;
    void send({ type: 'open', itemId }).then((res) => {
      if (canceled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setText(res.item.body?.text ?? '');
        setMono(res.item.meta?.mono === true);
        if (res.item.editable) {
          setDocId(res.item.id);
          setDocName(res.item.name);
          setStatus(`${res.item.name} — your file`);
        } else {
          setReadOnly(true);
          const m = res.item.meta;
          setStatus(
            ['Write-protected file', m?.modifiedAt ? `modified ${fmtShortStamp(m.modifiedAt)}` : null, m?.deletedAt ? `deleted ${fmtShortStamp(m.deletedAt)}` : null]
              .filter(Boolean)
              .join(' — '),
          );
        }
      } else {
        setError('Notepad cannot open this file.');
      }
    });
    return () => {
      canceled = true;
    };
  }, [itemId, send]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  /** Search from the caret, wrap to the top — plain Win95 Find Next. */
  const findNext = (needle: string) => {
    const q = needle.toLowerCase();
    if (!q) return;
    const ta = paperRef.current;
    const from = ta ? ta.selectionEnd : 0;
    const hay = text.toLowerCase();
    let at = hay.indexOf(q, from);
    if (at < 0) at = hay.indexOf(q);
    if (at < 0) {
      setFindMiss(`Cannot find "${needle}"`);
      return;
    }
    setFindMiss(null);
    ta?.focus();
    ta?.setSelectionRange(at, at + needle.length);
  };

  const insertTimeDate = () => {
    setMenuOpen(null);
    if (readOnly || !view) return;
    const stamp = timeDateStamp(view.clockNow);
    const ta = paperRef.current;
    const at = ta ? ta.selectionStart : text.length;
    const end = ta ? ta.selectionEnd : text.length;
    setText(text.slice(0, at) + stamp + text.slice(end));
    setDirty(true);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(at + stamp.length, at + stamp.length);
    });
  };

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
    setMenuOpen(null);
    if (docId) void doSave(docName, docId);
    else {
      setSaveAsName(docName);
      setSaveAsOpen(true);
    }
  };

  const onSaveAs = () => {
    setMenuOpen(null);
    setSaveAsName(docName);
    setSaveAsOpen(true);
  };

  const onNew = () => {
    setMenuOpen(null);
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
          $open={menuOpen === 'file'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMenuOpen((v) => (v === 'file' ? null : 'file'))}
          onMouseEnter={() => setMenuOpen((v) => (v ? 'file' : v))}
        >
          File
        </MenuButton>
        <MenuButton
          $open={menuOpen === 'edit'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMenuOpen((v) => (v === 'edit' ? null : 'edit'))}
          onMouseEnter={() => setMenuOpen((v) => (v ? 'edit' : v))}
        >
          Edit
        </MenuButton>
        <MenuButton
          $open={menuOpen === 'search'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMenuOpen((v) => (v === 'search' ? null : 'search'))}
          onMouseEnter={() => setMenuOpen((v) => (v ? 'search' : v))}
        >
          Search
        </MenuButton>
        {menuOpen === 'file' && (
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
            <MenuListItem size="sm" disabled>Page Setup...</MenuListItem>
            <MenuListItem size="sm" disabled>Print...</MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                useWindowStore.getState().close(windowId);
              }}
            >
              Exit
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'edit' && (
          <Drop style={{ left: 42 }}>
            <MenuListItem
              size="sm"
              disabled={readOnly}
              onClick={readOnly ? undefined : insertTimeDate}
            >
              <span style={{ display: 'flex', width: '100%', gap: 18 }}>
                Time/Date <span style={{ marginLeft: 'auto' }}>F5</span>
              </span>
            </MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                setWordWrap((w) => !w);
              }}
            >
              <span>{wordWrap ? '✓ ' : '   '}Word Wrap</span>
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'search' && (
          <Drop style={{ left: 84 }}>
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                setFindMiss(null);
                setFindOpen(true);
              }}
            >
              Find...
            </MenuListItem>
            <MenuListItem
              size="sm"
              disabled={!findText}
              onClick={
                findText
                  ? () => {
                      setMenuOpen(null);
                      findNext(findText);
                    }
                  : undefined
              }
            >
              <span style={{ display: 'flex', width: '100%', gap: 18 }}>
                Find Next <span style={{ marginLeft: 'auto' }}>F3</span>
              </span>
            </MenuListItem>
          </Drop>
        )}
      </MenuRow>
      <Paper
        $mono={mono}
        ref={paperRef}
        value={text}
        readOnly={readOnly}
        spellCheck={false}
        wrap={wordWrap ? 'soft' : 'off'}
        style={wordWrap ? undefined : { whiteSpace: 'pre', overflowX: 'auto' }}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'F3') {
            e.preventDefault();
            if (findText) findNext(findText);
          } else if (e.key === 'F5') {
            e.preventDefault();
            insertTimeDate();
          }
        }}
      />
      <StatusBar>
        {status}
        {dirty && !readOnly ? ' *' : ''}
      </StatusBar>

      {findOpen && (
        <DialogOverlay>
          <Window style={{ width: 330 }}>
            <WindowHeader style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>Find</span>
              <TitleBarButton onClick={() => setFindOpen(false)} aria-label="Close"><CloseGlyph /></TitleBarButton>
            </WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="np-find">Find what:</label>
                <TextInput
                  id="np-find"
                  value={findText}
                  autoFocus
                  onChange={(e) => {
                    setFindText(e.target.value);
                    setFindMiss(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && findText) findNext(findText);
                    if (e.key === 'Escape') setFindOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
              </div>
              {findMiss && <div style={{ marginTop: 8, color: '#802020' }}>{findMiss}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <Button disabled={!findText} onClick={() => findNext(findText)} style={{ width: 90 }}>
                  Find Next
                </Button>
                <Button onClick={() => setFindOpen(false)} style={{ width: 80 }}>
                  Cancel
                </Button>
              </div>
            </WindowContent>
          </Window>
        </DialogOverlay>
      )}

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
