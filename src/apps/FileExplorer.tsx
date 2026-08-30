import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, ScrollView, Separator, Toolbar, Window, WindowContent, WindowHeader } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { PropertiesDialog } from '../os/PropertiesDialog';
import { TYPE_NAMES, fmtShortStamp } from '../os/fileTypes';
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
  cursor: var(--cursor-arrow);
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
  z-index: 5000;
  min-width: 170px;
  font-size: 13px;
`;

/** Win95 List view: small icons flowing in columns. */
const ListGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0 8px;
  padding: 6px;
`;

const ListCell = styled.button<{ $selected: boolean }>`
  border: none;
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  color: ${(p) => (p.$selected ? '#fff' : 'inherit')};
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  cursor: var(--cursor-arrow);
  font-size: 13px;
  text-align: left;
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

/** Win95 Details view: the sortable column table. */
const DETAIL_COLS = '1.5fr 70px 1.1fr 120px';

const DetailHead = styled.div`
  display: grid;
  grid-template-columns: ${DETAIL_COLS};
  position: sticky;
  top: 0;
`;

const HeadCell = styled.button`
  border: 2px outset #dfdfdf;
  background: #d4d0c8;
  font-size: 12px;
  font-weight: bold;
  text-align: left;
  padding: 1px 6px;
  cursor: var(--cursor-arrow);
  overflow: hidden;
  white-space: nowrap;
`;

const DetailRow = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: ${DETAIL_COLS};
  align-items: center;
  width: 100%;
  border: none;
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  color: ${(p) => (p.$selected ? '#fff' : 'inherit')};
  padding: 2px 0;
  cursor: var(--cursor-arrow);
  font-size: 13px;
  text-align: left;
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0 6px;
  }
`;

type ViewMode = 'icons' | 'list' | 'details';
type SortKey = 'name' | 'size' | 'type' | 'modified';

function itemStamp(i: ItemSummary): string {
  return i.meta?.modifiedAt ?? i.meta?.createdAt ?? i.meta?.deletedAt ?? i.meta?.date ?? '';
}

function sortItems(items: ItemSummary[], key: SortKey, asc: boolean): ItemSummary[] {
  const cmp = (a: ItemSummary, b: ItemSummary): number => {
    switch (key) {
      case 'size':
        return (a.meta?.sizeKb ?? 0) - (b.meta?.sizeKb ?? 0);
      case 'type':
        return (TYPE_NAMES[a.kind] ?? a.kind).localeCompare(TYPE_NAMES[b.kind] ?? b.kind);
      case 'modified':
        return itemStamp(a).localeCompare(itemStamp(b));
      default:
        return a.name.localeCompare(b.name);
    }
  };
  // Folders sort above files, whatever the column — pure Win95.
  return [...items].sort((a, b) => {
    const af = a.kind === 'folder' ? 0 : 1;
    const bf = b.kind === 'folder' ? 0 : 1;
    if (af !== bf) return af - bf;
    const c = cmp(a, b) || a.name.localeCompare(b.name);
    return asc ? c : -c;
  });
}

const ItemMenu = styled(MenuList)`
  position: fixed;
  z-index: 100007;
  min-width: 150px;
  font-size: 13px;
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

type BarMenu = 'file' | 'edit' | 'view' | 'help' | null;

export function FileExplorer({ windowId, props }: AppWindowProps) {
  const { send, contentEpoch, view: gameView } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const closeWindow = useWindowStore((s) => s.close);
  const initialFolder = (props.folderId as string) ?? 'folder.c';
  const [menuOpen, setMenuOpen] = useState<BarMenu>(null);
  const [view, setView] = useState<ViewMode>('icons');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenuOpen(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

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
  const [floppyError, setFloppyError] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const [propsItem, setPropsItem] = useState<ItemSummary | null>(null);
  const ctxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!ctxRef.current?.contains(e.target as Node)) setCtxMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [ctxMenu]);
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
    // No disk in the drive. There was never a disk in the drive.
    if (item.meta?.path === 'A:\\') {
      setFloppyError(true);
      return;
    }
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

  const selectedItems = items.filter((i) => selected.includes(i.id));
  const displayed = view === 'details' ? sortItems(items, sortKey, sortAsc) : items;

  /** The one selection/drag/menu contract, shared by all three views. */
  const cellProps = (item: ItemSummary) => ({
    'data-item-id': item.id,
    $selected: selected.includes(item.id),
    onClick: (e: React.MouseEvent) => clickSelect(item, e),
    onDoubleClick: () => {
      const sel =
        selected.includes(item.id) && selected.length > 1
          ? items.filter((i) => selected.includes(i.id))
          : [item];
      openMany(sel);
    },
    onPointerDown: onItemPointerDown(item),
    onPointerMove: onItemPointerMove,
    onPointerUp: onItemPointerUp,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selected.includes(item.id)) {
        setSelected([item.id]);
        anchorRef.current = item.id;
      }
      setCtxMenu({ x: e.clientX, y: e.clientY, item });
    },
    style: canDragOut(item) ? ({ touchAction: 'none' } as React.CSSProperties) : undefined,
  });

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const menuItem = (label: string, onClick?: () => void, disabled = false, bold = false) => (
    <MenuListItem
      size="sm"
      disabled={disabled}
      onClick={
        disabled || !onClick
          ? undefined
          : () => {
              setMenuOpen(null);
              onClick();
            }
      }
    >
      {bold ? <b>{label}</b> : label}
    </MenuListItem>
  );

  const viewItem = (label: string, mode: ViewMode) => (
    <MenuListItem
      size="sm"
      onClick={() => {
        setMenuOpen(null);
        setView(mode);
      }}
    >
      <span>{view === mode ? '• ' : '   '}{label}</span>
    </MenuListItem>
  );

  const barButton = (name: Exclude<BarMenu, null>, label: string) => (
    <MenuButton
      $open={menuOpen === name}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setMenuOpen((v) => (v === name ? null : name))}
      onMouseEnter={() => setMenuOpen((v) => (v ? name : v))}
    >
      {label}
    </MenuButton>
  );

  return (
    <>
      <MenuRow ref={barRef}>
        {barButton('file', 'File')}
        {barButton('edit', 'Edit')}
        {barButton('view', 'View')}
        {barButton('help', 'Help')}
        {menuOpen === 'file' && (
          <Drop style={{ left: 0 }}>
            {menuItem('Open', () => openMany(selectedItems), selectedItems.length === 0, true)}
            <Separator />
            {menuItem(
              'Properties',
              () => setPropsItem(selectedItems[0]),
              selectedItems.length !== 1,
            )}
            <Separator />
            {menuItem('Close', () => closeWindow(windowId))}
          </Drop>
        )}
        {menuOpen === 'edit' && (
          <Drop style={{ left: 36 }}>
            {menuItem('Cut', undefined, true)}
            {menuItem('Copy', undefined, true)}
            {menuItem('Paste', undefined, true)}
            <Separator />
            {menuItem('Select All', () => setSelected(items.map((i) => i.id)))}
            {menuItem('Invert Selection', () =>
              setSelected(items.filter((i) => !selected.includes(i.id)).map((i) => i.id)),
            )}
          </Drop>
        )}
        {menuOpen === 'view' && (
          <Drop style={{ left: 72 }}>
            {viewItem('Large Icons', 'icons')}
            {viewItem('List', 'list')}
            {viewItem('Details', 'details')}
            <Separator />
            {menuItem('Refresh', () => void loadFolder(current.id))}
          </Drop>
        )}
        {menuOpen === 'help' && (
          <Drop style={{ left: 110 }}>
            {menuItem('About Horizons 95...', () => setAboutOpen(true))}
          </Drop>
        )}
      </MenuRow>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button onClick={goUp} disabled={stack.length === 0} title="Up One Level">
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
          {view === 'icons' && (
            <Grid>
              {displayed.map((item) => (
                <Cell key={item.id} {...cellProps(item)}>
                  <Icon
                    name={item.icon ?? 'doc'}
                    size={32}
                    shortcut={item.kind === 'shortcut' && item.meta?.appId !== 'recycle'}
                  />
                  <span>{item.name}</span>
                </Cell>
              ))}
            </Grid>
          )}
          {view === 'list' && (
            <ListGrid>
              {displayed.map((item) => (
                <ListCell key={item.id} {...cellProps(item)}>
                  <Icon
                    name={item.icon ?? 'doc'}
                    size={16}
                    shortcut={item.kind === 'shortcut' && item.meta?.appId !== 'recycle'}
                  />
                  <span>{item.name}</span>
                </ListCell>
              ))}
            </ListGrid>
          )}
          {view === 'details' && (
            <div>
              <DetailHead>
                <HeadCell onClick={() => sortBy('name')}>Name</HeadCell>
                <HeadCell onClick={() => sortBy('size')}>Size</HeadCell>
                <HeadCell onClick={() => sortBy('type')}>Type</HeadCell>
                <HeadCell onClick={() => sortBy('modified')}>Modified</HeadCell>
              </DetailHead>
              {displayed.map((item) => (
                <DetailRow key={item.id} {...cellProps(item)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon
                      name={item.icon ?? 'doc'}
                      size={16}
                      shortcut={item.kind === 'shortcut' && item.meta?.appId !== 'recycle'}
                    />
                    {item.name}
                  </span>
                  <span>{item.kind === 'folder' ? '' : `${item.meta?.sizeKb ?? 1}KB`}</span>
                  <span>{TYPE_NAMES[item.kind] ?? item.kind}</span>
                  <span>{fmtShortStamp(itemStamp(item))}</span>
                </DetailRow>
              ))}
            </div>
          )}
          {items.length === 0 && (
            <div style={{ padding: 12, color: '#666' }}>(empty folder)</div>
          )}
        </div>
      </ScrollView>
      {marquee && (
        <Marquee style={{ left: marquee.l, top: marquee.t, width: marquee.w, height: marquee.h }} />
      )}
      {ctxMenu && (
        <div ref={ctxRef} data-no-deskmenu>
          <ItemMenu style={{ left: Math.min(ctxMenu.x, window.innerWidth - 160), top: Math.min(ctxMenu.y, window.innerHeight - 200) }}>
            <MenuListItem
              size="sm"
              onClick={() => {
                setCtxMenu(null);
                enter(ctxMenu.item);
              }}
            >
              <b>Open</b>
            </MenuListItem>
            <Separator />
            <MenuListItem size="sm" disabled>Cut</MenuListItem>
            <MenuListItem size="sm" disabled>Copy</MenuListItem>
            <MenuListItem size="sm" disabled>Delete</MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setCtxMenu(null);
                setPropsItem(ctxMenu.item);
              }}
            >
              Properties
            </MenuListItem>
          </ItemMenu>
        </div>
      )}
      {propsItem && (
        <PropertiesDialog
          item={propsItem}
          location={current.path ?? current.name}
          onClose={() => setPropsItem(null)}
        />
      )}
      {floppyError && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100007,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
          data-no-deskmenu
        >
          <Window shadow style={{ width: 340 }}>
            <WindowHeader style={{ fontSize: 13 }}>A:\</WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon name="warning" size={32} />
                <p style={{ margin: 0 }}>
                  A:\ is not accessible.
                  <br />
                  <br />
                  The device is not ready.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={() => setFloppyError(false)} style={{ width: 80 }}>
                  Retry
                </Button>
                <Button onClick={() => setFloppyError(false)} style={{ width: 80 }}>
                  Cancel
                </Button>
              </div>
            </WindowContent>
          </Window>
        </div>
      )}
      {ghost && (
        <DragGhost style={{ left: ghost.x - 20, top: ghost.y - 24 }}>
          <Icon name={ghost.item.icon ?? 'doc'} size={32} />
          <span>{ghost.item.name}</span>
        </DragGhost>
      )}
      {aboutOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100007,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
          data-no-deskmenu
        >
          <Window shadow style={{ width: 360 }}>
            <WindowHeader style={{ fontSize: 13 }}>About Horizons 95</WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon name="computer" size={32} />
                <div>
                  <b>Microtech Horizons 95</b>
                  <br />
                  Version 4.00.950
                  <br />
                  Copyright © 1988-1995 Microtech Systems
                  <br />
                  <br />
                  This product is licensed to:
                  <br />
                  {gameView?.owner ?? 'the registered owner'}
                  <br />
                  <br />
                  Physical memory available: 32,752 KB
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={() => setAboutOpen(false)} style={{ width: 80 }}>
                  OK
                </Button>
              </div>
            </WindowContent>
          </Window>
        </div>
      )}
      <StatusBar>
        {(() => {
          if (selected.length > 1) return `${selected.length} object(s) selected`;
          const base = `${items.length} object(s)`;
          const it = items.find((i) => i.id === selected[0]);
          if (!it) return base;
          const size = it.meta?.sizeKb;
          const stamp = fmtShortStamp(itemStamp(it));
          const extra = [size ? `${size} KB` : null, stamp ? `modified ${stamp}` : null]
            .filter(Boolean)
            .join(', ');
          return extra ? `${base} — ${extra}` : base;
        })()}
      </StatusBar>
    </>
  );
}
