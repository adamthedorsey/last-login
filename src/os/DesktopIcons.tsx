import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from './launch';
import { Icon } from './icons';
import { TASKBAR_HEIGHT } from './windowStore';

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

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

export function DesktopIcons() {
  const { send, contentEpoch, ready, view } = useGame();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);

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

  const posOf = (item: ItemSummary): { x: number; y: number } =>
    layout[item.id] ?? { x: item.meta?.desktop?.x ?? ORIGIN, y: item.meta?.desktop?.y ?? ORIGIN };

  const onPointerDown = (item: ItemSummary) => (e: React.PointerEvent) => {
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
    </>
  );
}
