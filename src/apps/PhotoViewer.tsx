import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Toolbar } from 'react95';
import type { ItemContent, ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Stage = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  background: #3b3b3b;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img {
    max-width: 100%;
    max-height: 100%;
  }
`;

const Caption = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 4px 8px;
  font-size: 13px;
  flex-shrink: 0;
`;

export function PhotoViewer({ windowId, props }: AppWindowProps) {
  const { send } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const folderId = props.folderId as string | undefined;
  const startItemId = props.itemId as string | undefined;

  const [siblings, setSiblings] = useState<ItemSummary[]>([]);
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState<ItemContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (folderId) {
        const res = await send({ type: 'listChildren', parentId: folderId });
        if (cancelled || res.type !== 'children') return;
        const photos = res.items.filter((i) => i.meta?.photoSrc);
        setSiblings(photos);
        const idx = Math.max(0, photos.findIndex((p) => p.id === startItemId));
        setIndex(idx);
      } else if (startItemId) {
        setSiblings([{ id: startItemId, kind: 'photo', name: '' }]);
        setIndex(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderId, startItemId, send]);

  const currentId = siblings[index]?.id;

  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    void send({ type: 'open', itemId: currentId }).then((res) => {
      if (cancelled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setPhoto(res.item);
        setTitle(windowId, `${res.item.name} - Picture Viewer`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, send, setTitle, windowId]);

  const canNav = siblings.length > 1;
  const counter = useMemo(
    () => (canNav ? ` (${index + 1} of ${siblings.length})` : ''),
    [canNav, index, siblings.length],
  );

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0 }}>
        <Button disabled={!canNav || index === 0} onClick={() => setIndex((i) => i - 1)}>
          ◀ Prev
        </Button>
        <Button
          disabled={!canNav || index >= siblings.length - 1}
          onClick={() => setIndex((i) => i + 1)}
        >
          Next ▶
        </Button>
        <span style={{ fontSize: 13 }}>
          {photo?.name}
          {counter}
        </span>
      </Toolbar>
      <Stage style={{ marginTop: 4 }}>
        {photo?.meta?.photoSrc ? (
          <img src={photo.meta.photoSrc} alt={photo.meta?.caption ?? photo.name} />
        ) : (
          <span style={{ color: '#aaa' }}>Loading picture…</span>
        )}
      </Stage>
      <Caption>
        {photo?.meta?.caption ?? '(no caption)'}
        {photo?.meta?.createdAt ? ` — ${photo.meta.createdAt}` : ''}
      </Caption>
    </>
  );
}
