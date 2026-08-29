import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from './launch';
import { Icon } from './icons';

const IconButton = styled.button<{ $selected: boolean }>`
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

export function DesktopIcons() {
  const { send, contentEpoch, ready, view } = useGame();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

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

  return (
    <>
      {items.map((item) => (
        <IconButton
          key={item.id}
          $selected={selected === item.id}
          style={{ left: item.meta?.desktop?.x ?? 24, top: item.meta?.desktop?.y ?? 24 }}
          onClick={() => setSelected(item.id)}
          onDoubleClick={() => launchItem(item)}
        >
          <Icon name={item.icon ?? 'doc'} size={34} />
          <span>{item.name}</span>
        </IconButton>
      ))}
    </>
  );
}
