/**
 * The Win95 "you are not connected" scold, shared by any app that needs the
 * wire: warning icon, plain words, and the fix one click away.
 */
import { Button, Window, WindowContent, WindowHeader } from 'react95';
import { Icon } from './icons';
import { useWindowStore } from './windowStore';

export function OfflineAlert({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  const openApp = useWindowStore((s) => s.open);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100007,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.2)',
      }}
      data-no-deskmenu
    >
      <Window shadow style={{ width: 380 }}>
        <WindowHeader style={{ fontSize: 13 }}>{title}</WindowHeader>
        <WindowContent style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="warning" size={32} />
            <p style={{ margin: 0 }}>{message}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <Button
              onClick={() => {
                onClose();
                openApp('dialup');
              }}
              style={{ width: 110 }}
            >
              Connect...
            </Button>
            <Button onClick={onClose} style={{ width: 90 }}>
              Cancel
            </Button>
          </div>
        </WindowContent>
      </Window>
    </div>
  );
}
