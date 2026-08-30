import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, ScrollView, Separator, Toolbar } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { PropertiesDialog } from '../os/PropertiesDialog';
import { canCopyItem, fmtShortStamp } from '../os/fileTypes';
import { playError } from '../os/sounds';

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
  cursor: var(--cursor-arrow);
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const HeadRow = styled.div`
  display: grid;
  grid-template-columns: 26px 1.2fr 1.4fr 110px;
  gap: 6px;
  padding: 3px 6px;
  background: #d4d0c8;
  border-bottom: 1px solid #888;
  font-weight: bold;
  font-size: 12px;
`;

const ItemMenu = styled(MenuList)`
  position: fixed;
  z-index: 100007;
  min-width: 150px;
  font-size: 13px;
`;

export function RecycleBin() {
  const { send, contentEpoch } = useGame();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: ItemSummary } | null>(null);
  const [propsItem, setPropsItem] = useState<ItemSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ctxRef = useRef<HTMLDivElement | null>(null);

  // Deleted files can't be restored — but nothing stops you photographing
  // the wreck: a snapshot copy lands with your own files on the desktop.
  const copyToDesktop = async (item: ItemSummary) => {
    const res = await send({ type: 'copyItem', itemId: item.id });
    if (res.type === 'document' && res.ok && res.item) {
      setNotice(`Copied to Desktop as "${res.item.name}"`);
    } else {
      playError();
      setNotice('This item cannot be copied.');
    }
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!ctxRef.current?.contains(e.target as Node)) setCtxMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [ctxMenu]);

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
          Empty Recycle Bin
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
            onContextMenu={(e) => {
              e.preventDefault();
              setSelected(item.id);
              setCtxMenu({ x: e.clientX, y: e.clientY, item });
            }}
          >
            <Icon name={item.icon ?? 'doc'} size={18} />
            <span>{item.name}</span>
            <span>{item.meta?.originalPath}</span>
            <span>{fmtShortStamp(item.meta?.deletedAt)}</span>
          </Row>
        ))}
        {items.length === 0 && <div style={{ padding: 10, color: '#777' }}>(the bin is empty)</div>}
      </ScrollView>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {notice ?? `${items.length} deleted object(s). Double-click to peek inside.`}
      </Frame>
      {ctxMenu && (
        <div ref={ctxRef}>
          <ItemMenu style={{ left: Math.min(ctxMenu.x, window.innerWidth - 160), top: Math.min(ctxMenu.y, window.innerHeight - 180) }}>
            <MenuListItem
              size="sm"
              style={{ fontWeight: 'bold' }}
              onClick={() => {
                setCtxMenu(null);
                launchItem(ctxMenu.item);
              }}
            >
              Open
            </MenuListItem>
            <Separator />
            <MenuListItem size="sm" disabled>Restore</MenuListItem>
            <MenuListItem
              size="sm"
              disabled={!canCopyItem(ctxMenu.item)}
              onClick={
                canCopyItem(ctxMenu.item)
                  ? () => {
                      const it = ctxMenu.item;
                      setCtxMenu(null);
                      void copyToDesktop(it);
                    }
                  : undefined
              }
            >
              Copy to Desktop
            </MenuListItem>
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
        <PropertiesDialog item={propsItem} location="Recycle Bin" onClose={() => setPropsItem(null)} />
      )}
    </>
  );
}
