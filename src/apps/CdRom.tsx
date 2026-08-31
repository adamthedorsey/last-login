/**
 * The D: disc window — a spatial icon view, the way Win95 laid out a
 * CD-ROM's root. Items sit at AUTHORED positions (meta.at, engine-served),
 * and the canvas is larger than the default window: what's parked past
 * the edge stays out of sight until the player resizes or scrolls. The
 * status bar counts every object it holds — including the ones you
 * can't see yet.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { StatusGrip } from '../os/StatusGrip';
import type { AppWindowProps } from '../os/appRegistry';

/** The scrollable sheet: big enough to hold the farthest authored icon. */
const CANVAS_W = 860;
const CANVAS_H = 560;

const Sheet = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: scroll;
  background: #fff;
  /* Win95 scrollbars, always visible — they ARE the hint that the disc
     holds more than the window shows. Dithered track, beveled thumb. */
  &::-webkit-scrollbar {
    width: 16px;
    height: 16px;
  }
  &::-webkit-scrollbar-track {
    background: repeating-conic-gradient(#fff 0% 25%, #d4d0c8 0% 50%) 0 0 / 2px 2px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d4d0c8;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
  }
  &::-webkit-scrollbar-corner {
    background: #d4d0c8;
  }
`;

const IconSlot = styled.button<{ $active: boolean }>`
  position: absolute;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  padding: 4px 2px;
  font-size: 13px;
  cursor: var(--cursor-arrow);
  span {
    max-width: 92px;
    text-align: center;
    word-break: break-word;
    line-height: 1.15;
    padding: 0 2px;
    background: ${(p) => (p.$active ? '#000080' : 'transparent')};
    color: ${(p) => (p.$active ? '#fff' : '#000')};
    outline: ${(p) => (p.$active ? '1px dotted #fff' : 'none')};
  }
`;

const StatusBar = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 12px;
  flex-shrink: 0;
  position: relative;
`;

export function CdRom({ windowId: _windowId }: AppWindowProps) {
  const { send } = useGame();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    void send({ type: 'listChildren', parentId: 'drive.d' }).then((res) => {
      if (!canceled && res.type === 'children') setItems(res.items);
    });
    return () => {
      canceled = true;
    };
  }, [send]);

  return (
    <>
      <Sheet onPointerDown={() => setSelected(null)}>
        <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
          {items.map((item) => (
            <IconSlot
              key={item.id}
              $active={selected === item.id}
              style={{ left: item.meta?.at?.x ?? 24, top: item.meta?.at?.y ?? 18 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelected(item.id);
              }}
              onDoubleClick={() => launchItem(item)}
            >
              <Icon name={item.icon ?? 'doc'} size={32} />
              <span>{item.name}</span>
            </IconSlot>
          ))}
        </div>
      </Sheet>
      <StatusBar>
        {items.length} object(s)
        <StatusGrip />
      </StatusBar>
    </>
  );
}
