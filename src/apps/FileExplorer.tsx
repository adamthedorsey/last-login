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
  const [selected, setSelected] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ item: ItemSummary; x: number; y: number } | null>(null);
  const dragOutRef = useRef<{ item: ItemSummary; startX: number; startY: number; moved: boolean } | null>(null);

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
      setSelected(null);
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
        <Grid>
          {items.map((item) => (
            <Cell
              key={item.id}
              $selected={selected === item.id}
              onClick={() => setSelected(item.id)}
              onDoubleClick={() => enter(item)}
              onPointerDown={onItemPointerDown(item)}
              onPointerMove={onItemPointerMove}
              onPointerUp={onItemPointerUp}
              style={canDragOut(item) ? { touchAction: 'none' } : undefined}
            >
              <Icon name={item.icon ?? 'doc'} size={32} />
              <span>{item.name}</span>
            </Cell>
          ))}
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 12, color: '#666' }}>(empty folder)</div>
          )}
        </Grid>
      </ScrollView>
      {ghost && (
        <DragGhost style={{ left: ghost.x - 20, top: ghost.y - 24 }}>
          <Icon name={ghost.item.icon ?? 'doc'} size={32} />
          <span>{ghost.item.name}</span>
        </DragGhost>
      )}
      <StatusBar>
        {items.length} object(s)
        {selected
          ? ` — ${items.find((i) => i.id === selected)?.meta?.sizeKb ?? '?'} KB, modified ${
              items.find((i) => i.id === selected)?.meta?.modifiedAt ?? 'unknown'
            }`
          : ''}
      </StatusBar>
    </>
  );
}
