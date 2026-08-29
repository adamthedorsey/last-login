import { useState } from 'react';
import styled from 'styled-components';
import { Button, Frame } from 'react95';

const Display = styled(Frame).attrs({ variant: 'field' })`
  background: #fff;
  text-align: right;
  padding: 4px 8px;
  font-family: 'Fixedsys', 'Courier New', monospace;
  font-size: 16px;
  margin-bottom: 6px;
  overflow: hidden;
  white-space: nowrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  flex: 1;
`;

const Key = styled(Button)<{ $accent?: string }>`
  font-weight: bold;
  min-height: 30px;
  color: ${(p) => p.$accent ?? 'inherit'};
`;

type Op = '+' | '-' | '*' | '/';

function compute(a: number, op: Op, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return 'E';
  const s = String(Math.round(n * 1e10) / 1e10);
  return s.length > 14 ? n.toExponential(8) : s;
}

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [memory, setMemory] = useState(0);

  const digit = (d: string) => {
    if (fresh || display === '0') {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
    } else if (!(d === '.' && display.includes('.'))) {
      setDisplay(display + d);
    }
  };

  const doOp = (next: Op) => {
    const cur = parseFloat(display);
    const result = acc !== null && op && !fresh ? compute(acc, op, cur) : cur;
    setAcc(result);
    setDisplay(fmt(result));
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const result = compute(acc, op, parseFloat(display));
    setDisplay(fmt(result));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const unary = (f: (n: number) => number) => {
    setDisplay(fmt(f(parseFloat(display))));
    setFresh(true);
  };

  const back = () => {
    if (fresh) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const R = '#a03020';
  const B = '#000080';

  return (
    <>
      <Display>{memory !== 0 ? 'M  ' : ''}{display}</Display>
      <Grid>
        <Key $accent={R} onClick={() => setMemory(0)}>MC</Key>
        <Key $accent={R} onClick={() => { setDisplay(fmt(memory)); setFresh(true); }}>MR</Key>
        <Key $accent={R} onClick={() => setMemory(parseFloat(display))}>MS</Key>
        <Key $accent={R} onClick={() => setMemory(memory + parseFloat(display))}>M+</Key>
        <Key $accent={R} onClick={back}>←</Key>

        <Key $accent={B} onClick={() => digit('7')}>7</Key>
        <Key $accent={B} onClick={() => digit('8')}>8</Key>
        <Key $accent={B} onClick={() => digit('9')}>9</Key>
        <Key $accent={R} onClick={() => doOp('/')}>÷</Key>
        <Key onClick={() => unary(Math.sqrt)}>√</Key>

        <Key $accent={B} onClick={() => digit('4')}>4</Key>
        <Key $accent={B} onClick={() => digit('5')}>5</Key>
        <Key $accent={B} onClick={() => digit('6')}>6</Key>
        <Key $accent={R} onClick={() => doOp('*')}>×</Key>
        <Key onClick={() => unary((n) => n / 100)}>%</Key>

        <Key $accent={B} onClick={() => digit('1')}>1</Key>
        <Key $accent={B} onClick={() => digit('2')}>2</Key>
        <Key $accent={B} onClick={() => digit('3')}>3</Key>
        <Key $accent={R} onClick={() => doOp('-')}>−</Key>
        <Key onClick={() => unary((n) => (n === 0 ? NaN : 1 / n))}>1/x</Key>

        <Key $accent={B} onClick={() => digit('0')}>0</Key>
        <Key $accent={B} onClick={() => digit('.')}>.</Key>
        <Key onClick={() => unary((n) => -n)}>+/−</Key>
        <Key $accent={R} onClick={() => doOp('+')}>+</Key>
        <Key $accent={R} onClick={equals}>=</Key>

        <Key onClick={clear} style={{ gridColumn: '1 / -1' }}>C — clear</Key>
      </Grid>
    </>
  );
}
