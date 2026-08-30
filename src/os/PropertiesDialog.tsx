/**
 * The Win95 file Properties dialog (General tab). Everything shown comes
 * from the item's server-sent summary — which makes this dialog an
 * EVIDENCE SURFACE: timestamps are the machine's testimony.
 */
import { useEffect } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Window, WindowContent, WindowHeader } from 'react95';
import type { ItemSummary } from '@gamecore/types.ts';
import { Icon } from './icons';
import { dosShortName } from './dosname';
import { TYPE_NAMES } from './fileTypes';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100008;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin: 3px 0;
  span:first-child {
    width: 96px;
    flex-shrink: 0;
    color: #333;
  }
  span:last-child {
    word-break: break-word;
  }
`;

/** The etched 3D divider line. */
const Rule = styled.div`
  height: 2px;
  border-top: 1px solid #808080;
  border-bottom: 1px solid #fff;
  margin: 9px 0;
`;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format an in-world stamp straight from the ISO string (no Date() timezone
 * drift — these stamps are evidence). Includes the time when one exists.
 */
function fmtStamp(iso?: string): string | null {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  let out = `${weekday}, ${MONTHS[m - 1]} ${d}, ${y}`;
  if (iso.length >= 16) {
    const hh = Number(iso.slice(11, 13));
    const mm = iso.slice(14, 16);
    const h12 = hh % 12 || 12;
    out += `, ${h12}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`;
  }
  return out;
}

export function PropertiesDialog({
  item,
  location,
  onClose,
}: {
  item: ItemSummary;
  location?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const kb = item.meta?.sizeKb;
  const isDir = item.kind === 'folder' || item.kind === 'mailbox';
  const created = fmtStamp(item.meta?.createdAt);
  const modified = fmtStamp(item.meta?.modifiedAt);
  const deleted = fmtStamp(item.meta?.deletedAt);
  const sent = fmtStamp(item.meta?.date);
  return (
    <Overlay data-no-deskmenu onPointerDown={(e) => e.stopPropagation()}>
      <Window shadow style={{ width: 360 }}>
        <WindowHeader style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{item.name} Properties</span>
          <Button size="sm" onClick={onClose}>
            ×
          </Button>
        </WindowHeader>
        <WindowContent style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name={item.icon ?? 'doc'} size={32} shortcut={item.kind === 'shortcut'} />
            <b>{item.name}</b>
          </div>
          <Rule />
          <Row>
            <span>Type:</span>
            <span>{TYPE_NAMES[item.kind] ?? item.kind}</span>
          </Row>
          <Row>
            <span>Location:</span>
            <span>{item.meta?.originalPath ?? location ?? '—'}</span>
          </Row>
          {kb !== undefined && (
            <Row>
              <span>Size:</span>
              <span>
                {kb} KB ({(kb * 1024).toLocaleString('en-US')} bytes)
              </span>
            </Row>
          )}
          <Rule />
          <Row>
            <span>MS-DOS name:</span>
            <span>{dosShortName(item.name, isDir)}</span>
          </Row>
          {created && (
            <Row>
              <span>Created:</span>
              <span>{created}</span>
            </Row>
          )}
          {modified && (
            <Row>
              <span>Modified:</span>
              <span>{modified}</span>
            </Row>
          )}
          {sent && (
            <Row>
              <span>Sent:</span>
              <span>{sent}</span>
            </Row>
          )}
          {deleted && (
            <Row>
              <span>Deleted:</span>
              <span>{deleted}</span>
            </Row>
          )}
          <Rule />
          <Row>
            <span>Attributes:</span>
            <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Checkbox label="Read-only" checked={item.editable !== true} disabled />
              <Checkbox label="Archive" checked disabled />
              <Checkbox label="Hidden" checked={false} disabled />
            </span>
          </Row>
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
