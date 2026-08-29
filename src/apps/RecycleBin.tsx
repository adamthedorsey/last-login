import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, ScrollView, Toolbar } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';

const Row = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 26px 1.2fr 1.4fr 90px;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  text-align: left;
  padding: 3px 6px;
  font-size: 13px;
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  color: ${(p) => (p.$selected ? '#fff' : 'inherit')};
  cursor: default;
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const HeadRow = styled.div`
  display: grid;
  grid-template-columns: 26px 1.2fr 1.4fr 90px;
  gap: 6px;
  padding: 3px 6px;
  background: #d4d0c8;
  border-bottom: 1px solid #888;
  font-weight: bold;
  font-size: 12px;
`;

export function RecycleBin() {
  const { send, contentEpoch } = useGame();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'listChildren', parentId: 'folder.recycle' }).then((res) => {
      if (!cancelled && res.type === 'children') setItems(res.items);
    });
    return () => {
      cancelled = true;
    };
  }, [send, contentEpoch]);

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button disabled title="Nothing here can be restored... yet.">
          Restore
        </Button>
        <Button disabled title="Better not.">
          Empty Bin
        </Button>
      </Toolbar>
      <ScrollView style={{ flex: 1, marginTop: 4, background: '#fff' }}>
        <HeadRow>
          <span />
          <span>Name</span>
          <span>Original Location</span>
          <span>Deleted</span>
        </HeadRow>
        {items.map((item) => (
          <Row
            key={item.id}
            $selected={selected === item.id}
            onClick={() => setSelected(item.id)}
            onDoubleClick={() => launchItem(item)}
          >
            <Icon name={item.icon ?? 'doc'} size={18} />
            <span>{item.name}</span>
            <span>{item.meta?.originalPath}</span>
            <span>{item.meta?.deletedAt}</span>
          </Row>
        ))}
        {items.length === 0 && <div style={{ padding: 10, color: '#777' }}>(the bin is empty)</div>}
      </ScrollView>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {items.length} deleted object(s). Double-click to peek inside.
      </Frame>
    </>
  );
}
