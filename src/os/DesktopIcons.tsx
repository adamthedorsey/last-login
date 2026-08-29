import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from './launch';
import { Icon } from './icons';
import { TASKBAR_HEIGHT, useWindowStore } from './windowStore';

const GRID = 96;
const ORIGIN = 24;
const LAYOUT_KEY = 'lastlogin.desktopLayout';

type Layout = Record<string, { x: number; y: number }>;

// Player icon arrangement is cosmetic, per-device state — localStorage is the
// right home for it (the server-authored layout stays the starting point).
function loadLayout(): Layout {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Layout;
  } catch {
    return {};
  }
}

function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

/** Win95 "Line Up Icons": snap to the invisible desktop grid. */
function snap(v: number): number {
  return ORIGIN + Math.round((v - ORIGIN) / GRID) * GRID;
}

const IconButton = styled.button<{ $selected: boolean; $dragging: boolean }>`
  position: absolute;
  width: 84px;
  background: none;
  border: 1px dotted ${(p) => (p.$selected ? '#ffff99' : 'transparent')};
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: default;
  color: #fff;
  z-index: ${(p) => (p.$dragging ? 10 : 1)};
  opacity: ${(p) => (p.$dragging ? 0.75 : 1)};
  touch-action: none;

  span {
    font-size: 13px;
    text-align: center;
    line-height: 1.15;
    padding: 1px 3px;
    background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
    word-break: break-word;
  }
`;

const ContextMenu = styled(MenuList)`
  position: fixed;
  z-index: 100005;
  min-width: 180px;
  font-size: 13px;
`;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

/** Pick an unused "Name", "Name (2)", ... against current desktop names. */
function nextName(base: string, ext: string, taken: Set<string>): string {
  if (!taken.has(base + ext)) return base + ext;
  for (let n = 2; n < 99; n++) {
    if (!taken.has(`${base} (${n})${ext}`)) return `${base} (${n})${ext}`;
  }
  return base + ext;
}

export function DesktopIcons() {
  const { send, contentEpoch, ready, view } = useGame();
  const openApp = useWindowStore((s) => s.open);
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !view?.loggedIn) return;
    let cancelled = false;
    void send({ type: 'getDesktop' }).then((res) => {
      if (!cancelled && res.type === 'desktop') setItems(res.items);
    });
    return () => {
      cancelled = true;
    };
  }, [send, contentEpoch, ready, view?.loggedIn]);

  // Desktop right-click menu (windows and the taskbar keep the default).
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-deskmenu]')) return;
      e.preventDefault();
      setMenuAt({ x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - TASKBAR_HEIGHT - 180) });
    };
    window.addEventListener('contextmenu', onCtx);
    return () => window.removeEventListener('contextmenu', onCtx);
  }, []);

  useEffect(() => {
    if (!menuAt) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAt(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuAt]);

  const posOf = (item: ItemSummary): { x: number; y: number } =>
    layout[item.id] ?? { x: item.meta?.desktop?.x ?? ORIGIN, y: item.meta?.desktop?.y ?? ORIGIN };

  const takenNames = () => new Set(items.map((i) => i.name));

  const createDocument = async () => {
    setMenuAt(null);
    await send({ type: 'saveDocument', name: nextName('New Text Document', '.txt', takenNames()), text: '' });
  };

  const createFolder = async () => {
    setMenuAt(null);
    await send({ type: 'createFolder', name: nextName('New Folder', '', takenNames()) });
  };

  const lineUpIcons = () => {
    setMenuAt(null);
    setLayout({});
    saveLayout({});
  };

  const openDisplayProps = () => {
    setMenuAt(null);
    openApp('display');
  };

  const onPointerDown = (item: ItemSummary) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = posOf(item);
    dragRef.current = {
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: p.x,
      origY: p.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    d.moved = true;
    setDragPos({ id: d.id, x: d.origX + dx, y: d.origY + dy });
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.moved || !dragPos) {
      setDragPos(null);
      return;
    }

    const dragged = items.find((i) => i.id === d.id);
    const dropCenter = { x: dragPos.x + 42, y: dragPos.y + 44 };

    // Dropping one of YOUR documents onto one of YOUR folders files it away.
    if (dragged?.editable && dragged.kind === 'document') {
      const folder = items.find((i) => {
        if (i.id === d.id || i.kind !== 'folder' || !i.editable) return false;
        const p = posOf(i);
        return dropCenter.x >= p.x && dropCenter.x <= p.x + 84 && dropCenter.y >= p.y && dropCenter.y <= p.y + 92;
      });
      if (folder) {
        setDragPos(null);
        void send({ type: 'moveDocument', docId: dragged.id, folderId: folder.id });
        return;
      }
    }

    // Snap to the grid, clamp to the desktop, and avoid landing on a
    // neighbour's cell (walk to the nearest free cell if needed).
    const maxX = window.innerWidth - 92;
    const maxY = window.innerHeight - TASKBAR_HEIGHT - 92;
    let x = Math.max(ORIGIN, Math.min(snap(dragPos.x), snap(maxX)));
    let y = Math.max(ORIGIN, Math.min(snap(dragPos.y), snap(maxY)));

    const occupied = new Set(
      items.filter((i) => i.id !== d.id).map((i) => {
        const p = posOf(i);
        return `${p.x},${p.y}`;
      }),
    );
    let guard = 0;
    while (occupied.has(`${x},${y}`) && guard++ < 50) {
      y += GRID;
      if (y > maxY) {
        y = ORIGIN;
        x = x + GRID > maxX ? ORIGIN : x + GRID;
      }
    }

    const next = { ...layout, [d.id]: { x, y } };
    setLayout(next);
    saveLayout(next);
    setDragPos(null);
  };

  return (
    <>
      {items.map((item) => {
        const dragging = dragPos?.id === item.id;
        const p = dragging && dragPos ? dragPos : posOf(item);
        return (
          <IconButton
            key={item.id}
            $selected={selected === item.id}
            $dragging={dragging}
            style={{ left: p.x, top: p.y }}
            onClick={() => setSelected(item.id)}
            onDoubleClick={() => launchItem(item)}
            onPointerDown={onPointerDown(item)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <Icon name={item.icon ?? 'doc'} size={34} />
            <span>{item.name}</span>
          </IconButton>
        );
      })}

      {menuAt && (
        <div ref={menuRef}>
          <ContextMenu style={{ left: menuAt.x, top: menuAt.y }}>
            <MenuListItem size="sm" onClick={() => void createFolder()}>
              New Folder
            </MenuListItem>
            <MenuListItem size="sm" onClick={() => void createDocument()}>
              New Text Document
            </MenuListItem>
            <Separator />
            <MenuListItem size="sm" onClick={lineUpIcons}>
              Line Up Icons
            </MenuListItem>
            <Separator />
            <MenuListItem size="sm" onClick={openDisplayProps}>
              Properties
            </MenuListItem>
          </ContextMenu>
        </div>
      )}
    </>
  );
}
