import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, ScrollView, Toolbar } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { useWindowStore } from '../os/windowStore';
import { placeIcon, snapToGrid, ORIGIN } from '../os/desktopLayout';
import { TASKBAR_HEIGHT } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Address = styled(Frame).attrs({ variant: 'well' })`
  flex: 1;
  padding: 3px 8px;
  overflow: hidden;
  white-space: nowrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 4px;
  padding: 8px;
`;

const Cell = styled.button<{ $selected: boolean }>`
  border: none;
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  color: ${(p) => (p.$selected ? '#fff' : 'inherit')};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  cursor: default;
  font-size: 13px;
  span {
    text-align: center;
    word-break: break-word;
    line-height: 1.15;
  }
`;

const StatusBar = styled(Frame).attrs({ variant: 'well' })`
  padding: 2px 8px;
  font-size: 12px;
  margin-top: 4px;
`;

/** The Win95 rubber-band: a dotted rectangle, nothing fancier. */
const Marquee = styled.div`
  position: fixed;
  border: 1px dotted #000;
  pointer-events: none;
  z-index: 100005;
`;

/** Follows the pointer while dragging a file out of the window. */
const DragGhost = styled.div`
  position: fixed;
  z-index: 100006;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  opacity: 0.8;
  color: #fff;
  font-size: 12px;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
`;

interface Crumb {
  id: string;
  name: string;
  path?: string;
}

export function FileExplorer({ windowId, props }: AppWindowProps) {
  const { send, contentEpoch } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const initialFolder = (props.folderId as string) ?? 'folder.c';

  const [stack, setStack] = useState<Crumb[]>([]);
  const [current, setCurrent] = useState<Crumb>({ id: initialFolder, name: '...' });
  const [items, setItems] = useState<ItemSummary[]>([]);
  // Win95 selection model: multiple items, Ctrl toggles, Shift ranges from
  // the anchor, rubber-band drags on empty space, Ctrl+A takes everything.
  const [selected, setSelected] = useState<string[]>([]);
  const anchorRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [ghost, setGhost] = useState<{ item: ItemSummary; x: number; y: number } | null>(null);
  const dragOutRef = useRef<{ item: ItemSummary; startX: number; startY: number; moved: boolean } | null>(null);

  const clickSelect = (item: ItemSummary, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) =>
        prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id],
      );
      anchorRef.current = item.id;
    } else if (e.shiftKey && anchorRef.current) {
      const ids = items.map((i) => i.id);
      const a = ids.indexOf(anchorRef.current);
      const b = ids.indexOf(item.id);
      if (a >= 0 && b >= 0) setSelected(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
    } else {
      // A plain click on an item that's part of a multi-selection keeps the
      // group — that's what lets double-click (and Enter) open all of them.
      if (selected.includes(item.id) && selected.length > 1) {
        anchorRef.current = item.id;
        return;
      }
      setSelected([item.id]);
      anchorRef.current = item.id;
    }
  };

  /** Open several at once (Enter / double-click on a multi-selection).
   * Folders open their own windows, exactly like Win95 did. */
  const openMany = (list: ItemSummary[]) => {
    if (list.length === 0) return;
    if (list.length === 1) {
      enter(list[0]);
      return;
    }
    for (const it of list) launchItem(it);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelected(items.map((i) => i.id));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openMany(items.filter((i) => selected.includes(i.id)));
    }
  };

  // Rubber-band selection: starts on empty grid space, never on an item.
  const onGridPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    marqueeRef.current = { startX: e.clientX, startY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (!e.ctrlKey && !e.metaKey) setSelected([]);
  };

  const onGridPointerMove = (e: React.PointerEvent) => {
    const m = marqueeRef.current;
    if (!m) return;
    const l = Math.min(m.startX, e.clientX);
    const t = Math.min(m.startY, e.clientY);
    const r = Math.max(m.startX, e.clientX);
    const b = Math.max(m.startY, e.clientY);
    setMarquee({ l, t, w: r - l, h: b - t });
    const hit: string[] = [];
    gridRef.current?.querySelectorAll('[data-item-id]').forEach((c) => {
      const cr = c.getBoundingClientRect();
      if (cr.left < r && cr.right > l && cr.top < b && cr.bottom > t) {
        hit.push(c.getAttribute('data-item-id')!);
      }
    });
    setSelected(hit);
  };

  const onGridPointerUp = () => {
    marqueeRef.current = null;
    setMarquee(null);
  };

  // Drag one of YOUR documents out of this folder window and drop it on the
  // desktop to move it back out there.
  const canDragOut = (item: ItemSummary) =>
    item.editable === true && item.kind === 'document' && current.id.startsWith('playerfolder.');

  const onItemPointerDown = (item: ItemSummary) => (e: React.PointerEvent) => {
    if (e.button !== 0 || !canDragOut(item)) return;
    dragOutRef.current = { item, startX: e.clientX, startY: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onItemPointerMove = (e: React.PointerEvent) => {
    const d = dragOutRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 6) return;
    d.moved = true;
    setGhost({ item: d.item, x: e.clientX, y: e.clientY });
  };

  const onItemPointerUp = (e: React.PointerEvent) => {
    const d = dragOutRef.current;
    dragOutRef.current = null;
    setGhost(null);
    if (!d?.moved) return;
    // Windows and the taskbar are tagged data-no-deskmenu; anything else is desktop.
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (under?.closest('[data-no-deskmenu]')) return;
    const x = Math.max(ORIGIN, Math.min(snapToGrid(e.clientX - 42), snapToGrid(window.innerWidth - 92)));
    const y = Math.max(ORIGIN, Math.min(snapToGrid(e.clientY - 44), snapToGrid(window.innerHeight - TASKBAR_HEIGHT - 92)));
    placeIcon(d.item.id, x, y);
    void send({ type: 'moveDocument', docId: d.item.id, folderId: undefined });
  };

  const loadFolder = useCallback(
    async (folderId: string) => {
      const opened = await send({ type: 'open', itemId: folderId });
      const listed = await send({ type: 'listChildren', parentId: folderId });
      if (opened.type === 'open' && opened.ok && opened.item) {
        const crumb = {
          id: folderId,
          name: opened.item.name,
          path: opened.item.meta?.path,
        };
        setCurrent(crumb);
        setTitle(windowId, opened.item.name);
      }
      if (listed.type === 'children') setItems(listed.items);
      setSelected([]);
      anchorRef.current = null;
    },
    [send, setTitle, windowId],
  );

  useEffect(() => {
    void loadFolder(current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEpoch]);

  const enter = (item: ItemSummary) => {
    if (item.kind === 'folder' && item.id !== 'folder.recycle') {
      setStack((s) => [...s, current]);
      void loadFolder(item.id);
    } else {
      launchItem(item);
    }
  };

  const goUp = () => {
    const prev = stack[stack.length - 1];
    if (!prev) return;
    setStack((s) => s.slice(0, -1));
    void loadFolder(prev.id);
  };

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button onClick={goUp} disabled={stack.length === 0}>
          Up
        </Button>
        <Address>{current.path ?? current.name}</Address>
      </Toolbar>
      <ScrollView style={{ flex: 1, marginTop: 4, background: '#fff' }}>
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          style={{ minHeight: '100%', outline: 'none' }}
        >
          <Grid>
            {items.map((item) => (
              <Cell
                key={item.id}
                data-item-id={item.id}
                $selected={selected.includes(item.id)}
                onClick={(e: React.MouseEvent) => clickSelect(item, e)}
                onDoubleClick={() => {
                  const sel =
                    selected.includes(item.id) && selected.length > 1
                      ? items.filter((i) => selected.includes(i.id))
                      : [item];
                  openMany(sel);
                }}
                onPointerDown={onItemPointerDown(item)}
                onPointerMove={onItemPointerMove}
                onPointerUp={onItemPointerUp}
                style={canDragOut(item) ? { touchAction: 'none' } : undefined}
              >
                <Icon
                  name={item.icon ?? 'doc'}
                  size={32}
                  shortcut={item.kind === 'shortcut' && item.meta?.appId !== 'recycle'}
                />
                <span>{item.name}</span>
              </Cell>
            ))}
            {items.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: 12, color: '#666' }}>(empty folder)</div>
            )}
          </Grid>
        </div>
      </ScrollView>
      {marquee && (
        <Marquee style={{ left: marquee.l, top: marquee.t, width: marquee.w, height: marquee.h }} />
      )}
      {ghost && (
        <DragGhost style={{ left: ghost.x - 20, top: ghost.y - 24 }}>
          <Icon name={ghost.item.icon ?? 'doc'} size={32} />
          <span>{ghost.item.name}</span>
        </DragGhost>
      )}
      <StatusBar>
        {selected.length > 1
          ? `${selected.length} object(s) selected`
          : selected.length === 1
            ? `${items.length} object(s) — ${
                items.find((i) => i.id === selected[0])?.meta?.sizeKb ?? '?'
              } KB, modified ${
                items.find((i) => i.id === selected[0])?.meta?.modifiedAt ?? 'unknown'
              }`
            : `${items.length} object(s)`}
      </StatusBar>
    </>
  );
}
