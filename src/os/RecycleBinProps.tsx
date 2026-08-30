/**
 * The Recycle Bin's own Properties sheet (the Win95 Global tab). Pure
 * chrome — every control is period-correct and locked, because this
 * machine's bin is evidence and stays exactly as it was found.
 */
import styled from 'styled-components';
import { Button, Checkbox, Radio, Window, WindowContent, WindowHeader } from 'react95';
import { Icon } from './icons';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100008;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
`;

const Rule = styled.div`
  height: 2px;
  border-top: 1px solid #808080;
  border-bottom: 1px solid #fff;
  margin: 9px 0;
`;

export function RecycleBinProps({ onClose }: { onClose: () => void }) {
  return (
    <Overlay data-no-deskmenu onPointerDown={(e) => e.stopPropagation()}>
      <Window shadow style={{ width: 340 }}>
        <WindowHeader style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>Recycle Bin Properties</span>
          <Button size="sm" onClick={onClose}>
            ×
          </Button>
        </WindowHeader>
        <WindowContent style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name="trash" size={32} />
            <b>Recycle Bin</b>
          </div>
          <Rule />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Radio checked={false} disabled label="Configure drives independently" name="binmode" readOnly />
            <Radio checked disabled label="Use one setting for all drives:" name="binmode" readOnly />
          </div>
          <div style={{ margin: '10px 0 4px 18px' }}>
            <Checkbox
              label="Do not move files to the Recycle Bin.
Remove files immediately on delete."
              checked={false}
              disabled
              style={{ fontSize: 13, whiteSpace: 'pre-line' }}
            />
          </div>
          <div style={{ margin: '8px 0 0 18px' }}>
            Maximum size of Recycle Bin: <b>10%</b> of drive (C:)
          </div>
          <Rule />
          <Checkbox label="Display delete confirmation dialog" checked disabled style={{ fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <Button onClick={onClose} style={{ width: 80 }}>
              OK
            </Button>
            <Button onClick={onClose} style={{ width: 80 }}>
              Cancel
            </Button>
          </div>
        </WindowContent>
      </Window>
    </Overlay>
  );
}
