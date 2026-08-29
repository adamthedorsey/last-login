import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from './launch';
import { Icon } from './icons';
import { TASKBAR_HEIGHT, useWindowStore } from './windowStore';

import { GRID, ORIGIN, loadLayout, saveLayout, snapToGrid as snap, type Layout } from './desktopLayout';

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

const RenameInput = styled.input`
  width: 80px;
  font-size: 13px;
  font-family: inherit;
  border: 1px solid #000;
  background: #fff;
  color: #000;
  padding: 0 2px;
  text-align: center;
  user-select: text;
`;

interface DragState {
  /** The icon the pointer went down on, plus everything selected with it. */
  primary: string;
  ids: string[];
  origins: Record<string, { x: number; y: number }>;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The Win95 rubber-band: a dotted rectangle over the wallpaper. */
const DeskMarquee = styled.div`
  position: fixed;
  border: 1px dotted #fff;
  pointer-events: none;
  z-index: 100004;
`;

const ICON_W = 84;
const ICON_H = 92;

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
  // Win95 selection model: multiple icons, Ctrl/Shift add, rubber-band on
  // the wallpaper, Ctrl+A takes everything, Enter opens the lot.
  const [selected, setSelected] = useState<string[]>([]);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  const [marquee, setMarquee] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; keep: string[] } | null>(null);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameTimer = useRef<number | null>(null);

  const cancelRenameTimer = () => {
    if (renameTimer.current) {
      window.clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };

  const commitRename = (id: string, value: string) => {
    setRenaming(null);
    if (value.trim()) void send({ type: 'renameItem', itemId: id, name: value.trim() });
  };

  // Desktop keyboard: F2 renames, Ctrl+A selects all, Enter opens the
  // selection — but only when a window doesn't own the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (renaming) return;
      const owned = (document.activeElement as HTMLElement | null)?.closest('[data-no-deskmenu]');
      if (owned) return;
      if (e.key === 'F2') {
        if (selected.length !== 1) return;
        const item = items.find((i) => i.id === selected[0]);
        if (item?.editable) setRenaming({ id: item.id, value: item.name });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelected(items.map((i) => i.id));
      } else if (e.key === 'Enter' && selected.length > 0) {
        e.preventDefault();
        for (const it of items.filter((i) => selected.includes(i.id))) launchItem(it);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, selected, renaming]);

  // Rubber-band selection on the wallpaper itself. Anything tagged
  // data-no-deskmenu (windows, taskbar) and the icons handle their own
  // pointer events; what's left is empty desktop.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (typeof target?.closest === 'function' &&
          (target.closest('[data-no-deskmenu]') || target.closest('button'))) return;
      marqueeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        keep: e.ctrlKey || e.metaKey ? selected : [],
      };
      if (!e.ctrlKey && !e.metaKey) setSelected([]);
    };
    const onMove = (e: PointerEvent) => {
      const m = marqueeRef.current;
      if (!m) return;
      const l = Math.min(m.startX, e.clientX);
      const t = Math.min(m.startY, e.clientY);
      const r = Math.max(m.startX, e.clientX);
      const b = Math.max(m.startY, e.clientY);
      setMarquee({ l, t, w: r - l, h: b - t });
      const hit = items
        .filter((i) => {
          const p = layout[i.id] ?? { x: i.meta?.desktop?.x ?? ORIGIN, y: i.meta?.desktop?.y ?? ORIGIN };
          return p.x < r && p.x + ICON_W > l && p.y < b && p.y + ICON_H > t;
        })
        .map((i) => i.id);
      setSelected([...new Set([...m.keep, ...hit])]);
    };
    const onUp = () => {
      marqueeRef.current = null;
      setMarquee(null);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [items, layout, selected]);

  useEffect(() => {
    if (!ready || !view?.loggedIn) return;
    let cancelled = false;
    void send({ type: 'getDesktop' }).then((res) => {
      if (!cancelled && res.type === 'desktop') setItems(res.items);
    });
    // Pick up placements written by other surfaces (e.g. Explorer drag-out).
    setLayout(loadLayout());
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
    if (e.button !== 0 || renaming?.id === item.id) return;
    // Win95 selects on mousedown; dragging a member of a multi-selection
    // moves the whole group.
    let group = selected;
    if (!selected.includes(item.id)) {
      if (e.ctrlKey || e.metaKey) {
        group = [...selected, item.id];
      } else {
        group = [item.id];
      }
      setSelected(group);
    }
    const origins: Record<string, { x: number; y: number }> = {};
    for (const id of group) {
      const it = items.find((i) => i.id === id);
      if (it) origins[id] = posOf(it);
    }
    dragRef.current = {
      primary: item.id,
      ids: group,
      origins,
      startX: e.clientX,
      startY: e.clientY,
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
    setDragDelta({ dx, dy });
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.moved || !dragDelta) {
      setDragDelta(null);
      return;
    }

    // Dropping a single one of YOUR documents onto one of YOUR folders
    // files it away (group drops just move).
    if (d.ids.length === 1) {
      const dragged = items.find((i) => i.id === d.primary);
      const o = d.origins[d.primary];
      const dropCenter = { x: o.x + dragDelta.dx + 42, y: o.y + dragDelta.dy + 44 };
      if (dragged?.editable && dragged.kind === 'document') {
        const folder = items.find((i) => {
          if (i.id === d.primary || i.kind !== 'folder' || !i.editable) return false;
          const p = posOf(i);
          return (
            dropCenter.x >= p.x && dropCenter.x <= p.x + ICON_W &&
            dropCenter.y >= p.y && dropCenter.y <= p.y + ICON_H
          );
        });
        if (folder) {
          setDragDelta(null);
          void send({ type: 'moveDocument', docId: dragged.id, folderId: folder.id });
          return;
        }
      }
    }

    // Snap every dragged icon to the grid, clamp to the desktop, and walk
    // each to the nearest free cell so the group never lands on itself.
    const maxX = window.innerWidth - 92;
    const maxY = window.innerHeight - TASKBAR_HEIGHT - 92;
    const occupied = new Set(
      items
        .filter((i) => !d.ids.includes(i.id))
        .map((i) => {
          const p = posOf(i);
          return `${p.x},${p.y}`;
        }),
    );
    const next = { ...layout };
    for (const id of d.ids) {
      const o = d.origins[id];
      if (!o) continue;
      let x = Math.max(ORIGIN, Math.min(snap(o.x + dragDelta.dx), snap(maxX)));
      let y = Math.max(ORIGIN, Math.min(snap(o.y + dragDelta.dy), snap(maxY)));
      let guard = 0;
      while (occupied.has(`${x},${y}`) && guard++ < 80) {
        y += GRID;
        if (y > maxY) {
          y = ORIGIN;
          x = x + GRID > maxX ? ORIGIN : x + GRID;
        }
      }
      occupied.add(`${x},${y}`);
      next[id] = { x, y };
    }
    setLayout(next);
    saveLayout(next);
    setDragDelta(null);
  };

  return (
    <>
      {items.map((item) => {
        const inDragGroup = !!dragDelta && selected.includes(item.id);
        const base = posOf(item);
        const p = inDragGroup && dragDelta
          ? { x: base.x + dragDelta.dx, y: base.y + dragDelta.dy }
          : base;
        return (
          <IconButton
            key={item.id}
            $selected={selected.includes(item.id)}
            $dragging={inDragGroup}
            style={{ left: p.x, top: p.y }}
            onClick={(e) => {
              if (e.detail === 0) return; // keyboard-synthesized click (Enter)
              if (e.ctrlKey || e.metaKey) {
                cancelRenameTimer();
                setSelected((prev) =>
                  prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id],
                );
                return;
              }
              if (e.shiftKey) {
                cancelRenameTimer();
                setSelected((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                return;
              }
              // Second click on the single-selected player item starts a
              // rename — unless a double-click lands first (Win95 timing).
              if (selected.length === 1 && selected[0] === item.id && item.editable && !renaming) {
                cancelRenameTimer();
                renameTimer.current = window.setTimeout(
                  () => setRenaming({ id: item.id, value: item.name }),
                  600,
                );
              } else if (selected.includes(item.id) && selected.length > 1) {
                // Keep the group — that's what lets double-click open it all.
                cancelRenameTimer();
              } else {
                cancelRenameTimer();
                setSelected([item.id]);
              }
            }}
            onDoubleClick={() => {
              cancelRenameTimer();
              if (renaming?.id === item.id) return;
              if (selected.includes(item.id) && selected.length > 1) {
                for (const it of items.filter((i) => selected.includes(i.id))) launchItem(it);
              } else {
                launchItem(item);
              }
            }}
            onPointerDown={onPointerDown(item)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <Icon name={item.icon ?? 'doc'} size={34} />
            {renaming?.id === item.id ? (
              <RenameInput
                value={renaming.value}
                autoFocus
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRenaming({ id: item.id, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // don't let Enter "click" the icon button
                    commitRename(item.id, renaming.value);
                  }
                  if (e.key === 'Escape') setRenaming(null);
                  e.stopPropagation();
                }}
                onBlur={() => commitRename(item.id, renaming.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{item.name}</span>
            )}
          </IconButton>
        );
      })}

      {marquee && (
        <DeskMarquee
          style={{ left: marquee.l, top: marquee.t, width: marquee.w, height: marquee.h }}
        />
      )}

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
