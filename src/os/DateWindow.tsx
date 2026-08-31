/**
 * The Date window — our own build of react95's DatePicker, kept
 * pixel-faithful to the original layout but composed from primitives so
 * the header renders our icon map like every other window (the stock
 * widget hardcodes an emoji there). Chrome only: what it does with a
 * chosen date is the caller's business.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, NumberInput, ScrollView, Select, Toolbar, Window, WindowContent, WindowHeader } from 'react95';
import { Icon } from './icons';

const Header = styled(WindowHeader)`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const Calendar = styled(ScrollView)`
  width: 234px;
  margin: 16px 0;
  background: #fff;
`;

const WeekDays = styled.div`
  display: flex;
  background: #808080;
  color: #dfe0e3;
`;

const Dates = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const Cell = styled.div`
  text-align: center;
  height: 1.5em;
  line-height: 1.5em;
  width: 14.28%;
`;

const Day = styled.span<{ $active: boolean }>`
  cursor: var(--cursor-arrow);
  padding: 0 3px;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : '#000')};
`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, value) => ({ label, value }));

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DateWindow({
  date,
  onCancel,
  onAccept,
}: {
  /** ISO date-time; read with getUTC* (the caller anchors to UTC noon). */
  date: string;
  onCancel: () => void;
  onAccept: (chosen: string) => void;
}) {
  const initial = useMemo(() => new Date(Date.parse(date)), [date]);
  const [year, setYear] = useState(initial.getUTCFullYear());
  const [month, setMonth] = useState(initial.getUTCMonth());
  const [day, setDay] = useState(initial.getUTCDate());

  const shownDay = Math.min(day, daysInMonth(year, month));
  const firstDow = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);

  const accept = () => {
    const chosen = [year, month + 1, shownDay]
      .map((p) => String(p).padStart(2, '0'))
      .join('-');
    onAccept(chosen);
  };

  return (
    <Window shadow>
      <Header>
        <Icon name="clock" size={16} />
        <span>Date</span>
      </Header>
      <WindowContent>
        <Toolbar noPadding style={{ justifyContent: 'space-between' }}>
          <Select
            options={MONTHS}
            value={month}
            onChange={(opt) => setMonth(Number(opt.value))}
            width={128}
            menuMaxHeight={200}
          />
          <NumberInput value={year} onChange={(v) => setYear(v)} width={100} />
        </Toolbar>
        <Calendar>
          <WeekDays>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Cell key={i}>{d}</Cell>
            ))}
          </WeekDays>
          <Dates>
            {Array.from({ length: 42 }, (_, i) => {
              const n = i - firstDow + 1;
              if (n < 1 || n > total) return <Cell key={i} />;
              return (
                <Cell key={i} onClick={() => setDay(n)}>
                  <Day $active={n === shownDay}>{n}</Day>
                </Cell>
              );
            })}
          </Dates>
        </Calendar>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button fullWidth onClick={accept}>
            OK
          </Button>
        </div>
      </WindowContent>
    </Window>
  );
}
