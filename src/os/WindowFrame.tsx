import { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Button, Window, WindowContent, WindowHeader } from 'react95';
import { getApp } from './appRegistry';
import { TASKBAR_HEIGHT, useWindowStore, type OSWindow } from './windowStore';
import { Icon } from './icons';

const MIN_W = 300;
const MIN_H = 180;

const Shell = styled(Window)<{ $maximized: boolean }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  padding-bottom: 2px;
  pointer-events: auto;
`;

const Header = styled(WindowHeader)`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: default;
  flex-shrink: 0;
`;

const Title = styled.span`
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Content = styled(WindowContent)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px;
  overflow: hidden;
`;

const Glyph = styled.span`
  font-weight: bold;
  transform: translateY(-1px);
  display: inline-block;
`;

/** Classic ribbed corner grip (visual only — the SE handle does the work). */
const CornerGrip = styled.div`
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 14px;
  height: 14px;
  background: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    #808080 2px 3px,
    #ffffff 3px 4px
  );
  pointer-events: none;
`;

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: Array<{ dir: ResizeDir; style: React.CSSProperties }> = [
  { dir: 'n', style: { top: -3, left: 10, right: 10, height: 7, cursor: 'ns-resize' } },
  { dir: 's', style: { bottom: -3, left: 10, right: 10, height: 7, cursor: 'ns-resize' } },
  { dir: 'e', style: { right: -3, top: 10, bottom: 10, width: 7, cursor: 'ew-resize' } },
  { dir: 'w', style: { left: -3, top: 10, bottom: 10, width: 7, cursor: 'ew-resize' } },
  { dir: 'nw', style: { top: -3, left: -3, width: 13, height: 13, cursor: 'nwse-resize' } },
  { dir: 'se', style: { bottom: -3, right: -3, width: 18, height: 18, cursor: 'nwse-resize' } },
  { dir: 'ne', style: { top: -3, right: -3, width: 13, height: 13, cursor: 'nesw-resize' } },
  { dir: 'sw', style: { bottom: -3, left: -3, width: 13, height: 13, cursor: 'nesw-resize' } },
];

interface DragState {
  startX: number;
  startY: number;
  winX: number;
  winY: number;
}

interface ResizeState extends DragState {
  dir: ResizeDir;
  winW: number;
  winH: number;
}

export function WindowFrame({ win, focused }: { win: OSWindow; focused: boolean }) {
  const { focus, close, minimize, toggleMaximize, move, setRect } = useWindowStore();
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  const def = getApp(win.appId);

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) return;
      if ((e.target as HTMLElement).closest('button')) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.maximized, win.x, win.y],
  );

  const onHeaderPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nx = d.winX + (e.clientX - d.startX);
      const ny = d.winY + (e.clientY - d.startY);
      move(
        win.id,
        Math.max(-win.w + 60, Math.min(nx, window.innerWidth - 60)),
        Math.max(0, Math.min(ny, window.innerHeight - TASKBAR_HEIGHT - 24)),
      );
    },
    [move, win.id, win.w],
  );

  const onHeaderPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizeDown = useCallback(
    (dir: ResizeDir) => (e: React.PointerEvent) => {
      e.stopPropagation();
      focus(win.id);
      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        winX: win.x,
        winY: win.y,
        winW: win.w,
        winH: win.h,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [focus, win.id, win.x, win.y, win.w, win.h],
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      let { winX: x, winY: y, winW: w, winH: h } = r;

      if (r.dir.includes('e')) w = Math.max(MIN_W, r.winW + dx);
      if (r.dir.includes('s')) h = Math.max(MIN_H, r.winH + dy);
      if (r.dir.includes('w')) {
        w = Math.max(MIN_W, r.winW - dx);
        x = r.winX + (r.winW - w);
      }
      if (r.dir.includes('n')) {
        h = Math.max(MIN_H, r.winH - dy);
        y = r.winY + (r.winH - h);
      }
      if (y < 0) {
        h += y;
        y = 0;
      }

      setRect(win.id, { x, y, w, h });
    },
    [setRect, win.id],
  );

  const onResizeUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  if (!def) return null;
  const AppComponent = def.component;

  const rect = win.maximized
    ? { left: 0, top: 0, width: '100vw', height: `calc(100vh - ${TASKBAR_HEIGHT}px)` }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <Shell
      $maximized={win.maximized}
      style={{ ...rect, zIndex: win.z, display: win.minimized ? 'none' : 'flex' }}
      onPointerDown={() => focus(win.id)}
    >
      <Header
        active={focused}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <Icon name={win.icon} size={16} />
        <Title>{win.title}</Title>
        <Button size="sm" onClick={() => minimize(win.id)} aria-label="Minimize">
          <Glyph style={{ transform: 'translateY(3px)' }}>_</Glyph>
        </Button>
        <Button size="sm" onClick={() => toggleMaximize(win.id)} aria-label="Maximize">
          <Glyph>□</Glyph>
        </Button>
        <Button size="sm" onClick={() => close(win.id)} aria-label="Close">
          <Glyph>×</Glyph>
        </Button>
      </Header>
      <Content>
        <AppComponent windowId={win.id} props={win.props} />
      </Content>
      {!win.maximized && (
        <>
          <CornerGrip />
          {HANDLES.map((h) => (
            <div
              key={h.dir}
              style={{ position: 'absolute', zIndex: 5, ...h.style }}
              onPointerDown={onResizeDown(h.dir)}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
            />
          ))}
        </>
      )}
    </Shell>
  );
}
