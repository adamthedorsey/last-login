import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator, Window, WindowContent, WindowHeader } from 'react95';
import { getApp } from './appRegistry';
import { TASKBAR_HEIGHT, useWindowStore, type OSWindow } from './windowStore';
import { Icon } from './icons';
import { CloseGlyph, MaximizeGlyph, MinimizeGlyph, RestoreGlyph, TitleBarButton } from './glyphs';
import { animateZoom, taskbarButtonBox } from './zoomRect';

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
  cursor: var(--cursor-arrow);
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

/** The control-box (system) menu behind the title-bar icon. */
const SysMenu = styled(MenuList)`
  position: fixed;
  z-index: 100007;
  min-width: 150px;
  font-size: 13px;
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
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [sysMenu, setSysMenu] = useState<{ x: number; y: number } | null>(null);
  const sysRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sysMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!sysRef.current?.contains(e.target as Node)) setSysMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [sysMenu]);

  const def = getApp(win.appId);

  /** Minimize with the Win95 zoom-to-taskbar wireframe. */
  const doMinimize = useCallback(() => {
    const r = shellRef.current?.getBoundingClientRect();
    if (r) {
      animateZoom({ x: r.left, y: r.top, w: r.width, h: r.height }, taskbarButtonBox(win.id));
    }
    minimize(win.id);
  }, [minimize, win.id]);

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
      ref={shellRef}
      $maximized={win.maximized}
      data-no-deskmenu
      data-win-shell={win.id}
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
        {/* The control box: click for the system menu, double-click closes. */}
        <span
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSysMenu((m) => (m ? null : { x: r.left, y: r.bottom + 2 }));
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            close(win.id);
          }}
          style={{ display: 'inline-flex', cursor: 'default' }}
        >
          <Icon name={win.icon} size={16} />
        </span>
        <Title>{win.title}</Title>
        {/* Win95 grouping: minimize and maximize butt together; close sits
            a hair apart. The wrapper defeats the header's own gap. */}
        <span style={{ display: 'inline-flex' }}>
          <TitleBarButton onClick={doMinimize} aria-label="Minimize">
            <MinimizeGlyph />
          </TitleBarButton>
          <TitleBarButton
            onClick={() => toggleMaximize(win.id)}
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
          >
            {win.maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </TitleBarButton>
        </span>
        <TitleBarButton onClick={() => close(win.id)} aria-label="Close" style={{ marginLeft: -4 }}>
          <CloseGlyph />
        </TitleBarButton>
      </Header>
      <Content>
        <AppComponent windowId={win.id} props={win.props} />
      </Content>
      {sysMenu && (
        <div ref={sysRef}>
          <SysMenu style={{ left: sysMenu.x, top: sysMenu.y }}>
            <MenuListItem
              size="sm"
              disabled={!win.maximized}
              onClick={
                win.maximized
                  ? () => {
                      setSysMenu(null);
                      toggleMaximize(win.id);
                    }
                  : undefined
              }
            >
              Restore
            </MenuListItem>
            <MenuListItem size="sm" disabled>Move</MenuListItem>
            <MenuListItem size="sm" disabled>Size</MenuListItem>
            <MenuListItem
              size="sm"
              onClick={() => {
                setSysMenu(null);
                doMinimize();
              }}
            >
              Minimize
            </MenuListItem>
            <MenuListItem
              size="sm"
              disabled={win.maximized}
              onClick={
                win.maximized
                  ? undefined
                  : () => {
                      setSysMenu(null);
                      toggleMaximize(win.id);
                    }
              }
            >
              Maximize
            </MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setSysMenu(null);
                close(win.id);
              }}
            >
              <span style={{ display: 'flex', width: '100%', gap: 18 }}>
                <b>Close</b> <span style={{ marginLeft: 'auto' }}>Alt+F4</span>
              </span>
            </MenuListItem>
          </SysMenu>
        </div>
      )}
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
