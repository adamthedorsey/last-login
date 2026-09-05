import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';

const SIZE = 9;
const MINES = 10;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adj: number;
}

type Board = Cell[][];
type Status = 'ready' | 'playing' | 'won' | 'lost';

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 })),
  );
}

function neighbors(r: number, c: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
    }
  return out;
}

function plantMines(board: Board, safeR: number, safeC: number): void {
  let planted = 0;
  while (planted < MINES) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (board[r][c].mine || (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) continue;
    board[r][c].mine = true;
    planted++;
  }
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      board[r][c].adj = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
}

function flood(board: Board, r: number, c: number): void {
  const stack: Array<[number, number]> = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const cell = board[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) {
      for (const n of neighbors(cr, cc)) stack.push(n);
    }
  }
}

const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];

const Led = styled.div`
  background: #000;
  color: #ff2020;
  font-family: 'Fixedsys', 'Courier New', monospace;
  font-size: 18px;
  padding: 1px 5px;
  min-width: 46px;
  text-align: center;
  border: 2px inset #888;
`;

const Face = styled.button`
  width: 34px;
  height: 34px;
  font-size: 17px;
  border: 2px outset #fff;
  background: #d4d0c8;
  cursor: var(--cursor-arrow);
  &:active {
    border-style: inset;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${SIZE}, 26px);
  gap: 0;
  justify-content: center;
`;

const Sq = styled.button<{ $revealed: boolean; $boom?: boolean }>`
  width: 26px;
  height: 26px;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  cursor: var(--cursor-arrow);
  border: ${(p) => (p.$revealed ? '1px solid #a8a8a8' : '2px outset #fff')};
  background: ${(p) => (p.$boom ? '#ff4040' : p.$revealed ? '#d0ccc4' : '#d4d0c8')};
  padding: 0;
`;

export function Minefield() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [status, setStatus] = useState<Status>('ready');
  const [boomAt, setBoomAt] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status]);

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setStatus('ready');
    setBoomAt(null);
    setSeconds(0);
  }, []);

  const flagsUsed = board.flat().filter((c) => c.flagged).length;

  const checkWin = (b: Board): boolean =>
    b.flat().filter((c) => !c.revealed).length === MINES;

  const reveal = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    if (status === 'ready') {
      plantMines(next, r, c);
      setStatus('playing');
    }
    const cell = next[r][c];
    if (cell.flagged || cell.revealed) return;
    if (cell.mine) {
      next.forEach((row) => row.forEach((x) => { if (x.mine) x.revealed = true; }));
      setBoard(next);
      setBoomAt(`${r},${c}`);
      setStatus('lost');
      return;
    }
    flood(next, r, c);
    setBoard(next);
    if (checkWin(next)) setStatus('won');
  };

  const flag = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const cell = next[r][c];
    if (!cell.revealed) cell.flagged = !cell.flagged;
    setBoard(next);
  };

  const face = status === 'lost' ? '☹︎' : status === 'won' ? '☻︎' : '☺︎';

  return (
    <Frame variant="well" style={{ padding: 8, alignSelf: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Led>{String(Math.max(0, MINES - flagsUsed)).padStart(3, '0')}</Led>
        <Face onClick={reset} aria-label="New game">{face}</Face>
        <Led>{String(seconds).padStart(3, '0')}</Led>
      </div>
      <Grid>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <Sq
              key={`${r},${c}`}
              $revealed={cell.revealed}
              $boom={boomAt === `${r},${c}`}
              style={{ color: NUM_COLORS[cell.adj] }}
              onClick={() => reveal(r, c)}
              onContextMenu={(e) => {
                e.preventDefault();
                flag(r, c);
              }}
            >
              {cell.revealed
                ? cell.mine
                  ? '●'
                  : cell.adj || ''
                : cell.flagged
                  ? '⚑︎'
                  : ''}
            </Sq>
          )),
        )}
      </Grid>
      <div style={{ fontSize: 11, color: '#555', marginTop: 6, textAlign: 'center' }}>
        left-click: dig — right-click: flag
      </div>
    </Frame>
  );
}
