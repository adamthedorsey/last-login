import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import { useGame } from '../game/gameContext';
import { PIXEL_MONO } from '../theme';
import type { AppWindowProps } from '../os/appRegistry';

const Paper = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  padding: 8px 10px;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  white-space: pre-wrap;
  user-select: text;
  cursor: text;
  line-height: 1.45;
`;

const Meta = styled.div`
  font-size: 12px;
  color: #555;
  padding: 3px 2px;
  flex-shrink: 0;
`;

export function Notepad({ props }: AppWindowProps) {
  const { send } = useGame();
  const itemId = props.itemId as string | undefined;
  const [text, setText] = useState<string>('');
  const [meta, setMeta] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setText('');
      return;
    }
    let cancelled = false;
    void send({ type: 'open', itemId }).then((res) => {
      if (cancelled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setText(res.item.body?.text ?? '(this file cannot be displayed)');
        const m = res.item.meta;
        setMeta(
          [
            m?.modifiedAt ? `Modified: ${m.modifiedAt}` : null,
            m?.deletedAt ? `Deleted: ${m.deletedAt}` : null,
            m?.sizeKb ? `${m.sizeKb} KB` : null,
          ]
            .filter(Boolean)
            .join('   '),
        );
      } else {
        setError('Notepad cannot open this file.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [itemId, send]);

  if (error) return <div style={{ padding: 12 }}>{error}</div>;

  return (
    <>
      <Paper>{itemId ? text : '(new file — this machine is read-only for now)'}</Paper>
      {meta && <Meta>{meta}</Meta>}
    </>
  );
}
