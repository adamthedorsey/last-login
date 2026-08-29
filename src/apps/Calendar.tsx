import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Toolbar } from 'react95';
import { useGame } from '../game/gameContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  flex: 1;
  min-height: 0;
`;

const DowCell = styled.div`
  text-align: center;
  font-weight: bold;
  font-size: 12px;
  padding: 2px 0;
  background: #d4d0c8;
  border-bottom: 1px solid #888;
`;

const DayCell = styled.button<{ $today: boolean; $selected: boolean; $muted: boolean }>`
  border: 1px solid ${(p) => (p.$today ? '#000080' : '#c0c0c0')};
  border-width: ${(p) => (p.$today ? 2 : 1)}px;
  background: ${(p) => (p.$selected ? '#000080' : '#fff')};
  color: ${(p) => (p.$selected ? '#fff' : p.$muted ? '#aaa' : '#000')};
  font-size: 12px;
  text-align: left;
  padding: 2px 3px;
  min-height: 34px;
  cursor: default;
  position: relative;
`;

const Mark = styled.span<{ $selected: boolean }>`
  position: absolute;
  bottom: 2px;
  left: 3px;
  right: 3px;
  font-size: 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${(p) => (p.$selected ? '#ffff99' : '#a03020')};
`;

const DetailPane = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 5px 8px;
  font-size: 13px;
  min-height: 40px;
  flex-shrink: 0;
  background: #fffef2;
`;

/** Entries live in server content as "YYYY-MM-DD: text" lines (datebook.dat). */
function parseEntries(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    if (!m) continue;
    const list = map.get(m[1]) ?? [];
    list.push(m[2]);
    map.set(m[1], list);
  }
  return map;
}

export function Calendar() {
  const { send, view } = useGame();
  const now = useMemo(() => new Date(view?.clockNow ?? '1997-10-18T21:47:00'), [view?.clockNow]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'open', itemId: 'file.datebook-1997' }).then((res) => {
      if (cancelled || res.type !== 'open' || !res.ok || !res.item?.body?.text) return;
      setEntries(parseEntries(res.item.body.text));
    });
    return () => {
      cancelled = true;
    };
  }, [send]);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const key = (d: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;

  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEntries = selected ? entries.get(selected) ?? [] : [];

  return (
    <>
      <Toolbar style={{ gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <Button onClick={() => shift(-1)}>◀</Button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
          {MONTHS[month]} {year}
        </span>
        <Button onClick={() => shift(1)}>▶</Button>
      </Toolbar>
      <MonthGrid style={{ marginTop: 4 }}>
        {DOW.map((d) => (
          <DowCell key={d}>{d}</DowCell>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`x${i}`} style={{ background: '#e8e4d8' }} />
          ) : (
            <DayCell
              key={d}
              $today={key(d) === todayKey}
              $selected={selected === key(d)}
              $muted={false}
              onClick={() => setSelected(key(d))}
            >
              {d}
              {entries.has(key(d)) && (
                <Mark $selected={selected === key(d)}>{entries.get(key(d))![0]}</Mark>
              )}
            </DayCell>
          ),
        )}
      </MonthGrid>
      <DetailPane>
        {selected === null ? (
          <span style={{ color: '#777' }}>Click a day.</span>
        ) : selectedEntries.length === 0 ? (
          <span style={{ color: '#777' }}>{selected} — nothing written here.</span>
        ) : (
          selectedEntries.map((e, i) => <div key={i}>• {e}</div>)
        )}
      </DetailPane>
    </>
  );
}
