import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, ScrollView, Toolbar } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { useWindowStore } from '../os/windowStore';
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
