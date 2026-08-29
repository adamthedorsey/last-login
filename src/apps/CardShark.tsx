import styled from 'styled-components';
import { Button } from 'react95';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px 8px;
  text-align: center;
`;

const Card = styled.div`
  width: 56px;
  height: 76px;
  background: #fff;
  border: 1px solid #333;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: #c0392b;
  box-shadow: 3px 3px 0 #3a6ea5;
`;

export function CardShark({ windowId }: AppWindowProps) {
  const close = useWindowStore((s) => s.close);
  return (
    <Body>
      <Card>♥</Card>
      <div>
        <b>CardShark 2 cannot start.</b>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          Please insert the CardShark 2 CD-ROM (Disc 2) and try again.
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
          (The disc tray is, of course, empty. It always was.)
        </div>
      </div>
      <Button onClick={() => close(windowId)} style={{ width: 90 }}>
        OK
      </Button>
    </Body>
  );
}
