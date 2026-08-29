import { useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Toolbar, Window, WindowContent, WindowHeader } from 'react95';

// Klondike, draw-one. Click a card to pick it up, click where it should go.
// Double-click sends a card to its foundation.

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = (suit: number) => suit === 1 || suit === 2;

const CARD_W = 68;
const CARD_H = 92;
const FAN_UP = 22;
const FAN_DOWN = 8;

interface Card {
  rank: number; // 1..13
  suit: number; // 0..3
  faceUp: boolean;
}

interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

type Sel =
  | { kind: 'waste' }
  | { kind: 'foundation'; pile: number }
  | { kind: 'tableau'; pile: number; index: number }
  | null;

function newDeal(): GameState {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++)
    for (let r = 1; r <= 13; r++) deck.push({ rank: r, suit: s, faceUp: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const tableau: Card[][] = [];
  let idx = 0;
  for (let p = 0; p < 7; p++) {
    tableau.push(deck.slice(idx, idx + p + 1).map((c, i) => ({ ...c, faceUp: i === p })));
    idx += p + 1;
  }
  return { stock: deck.slice(idx), waste: [], foundations: [[], [], [], []], tableau };
}

function clone(g: GameState): GameState {
  return structuredClone(g);
}

// ---------------------------------------------------------------------------

const Felt = styled.div`
  flex: 1;
  min-height: 0;
  background: #007000;
  border: 2px inset #888;
  padding: 10px;
  overflow: auto;
  user-select: none;
`;

const TopRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
`;

const Columns = styled.div`
  display: flex;
  gap: 10px;
`;

const Slot = styled.div<{ $selected?: boolean }>`
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  border: 1px dashed rgba(255, 255, 255, 0.45);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 26px;
  outline: ${(p) => (p.$selected ? '3px solid #ffcc00' : 'none')};
`;

const CardBox = styled.div<{ $red?: boolean; $selected?: boolean; $back?: boolean }>`
  width: ${CARD_W}px;
  height: ${CARD_H}px;
  border-radius: 4px;
  border: 1px solid #222;
  background: ${(p) =>
    p.$back
      ? `#1a3a8a repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 2px, transparent 2px 6px)`
      : '#fff'};
  color: ${(p) => (p.$red ? '#c00000' : '#000')};
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
  outline: ${(p) => (p.$selected ? '3px solid #ffcc00' : 'none')};
  position: relative;
  font-family: Arial, Helvetica, sans-serif;
`;

const Corner = styled.div`
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  text-align: center;
`;

const Pip = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
`;

function CardView({
  card,
  selected,
  onClick,
  onDoubleClick,
  style,
}: {
  card: Card;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
}) {
  if (!card.faceUp) {
    return <CardBox $back style={style} onClick={onClick} />;
  }
  return (
    <CardBox $red={isRed(card.suit)} $selected={selected} style={style} onClick={onClick} onDoubleClick={onDoubleClick}>
      <Corner>
        {RANKS[card.rank]}
        <br />
        {SUITS[card.suit]}
      </Corner>
      <Pip>{SUITS[card.suit]}</Pip>
    </CardBox>
  );
}

// ---------------------------------------------------------------------------

export function Solitaire() {
  const [game, setGame] = useState<GameState>(newDeal);
  const [sel, setSel] = useState<Sel>(null);
  const [moves, setMoves] = useState(0);

  const won = game.foundations.every((f) => f.length === 13);

  const deal = () => {
    setGame(newDeal());
    setSel(null);
    setMoves(0);
  };

  const commit = (g: GameState) => {
    setGame(g);
    setSel(null);
    setMoves((m) => m + 1);
  };

  /** Cards the current selection would move. */
  const selectedCards = (g: GameState, s: Sel): Card[] => {
    if (!s) return [];
    if (s.kind === 'waste') return g.waste.length ? [g.waste[g.waste.length - 1]] : [];
    if (s.kind === 'foundation') {
      const f = g.foundations[s.pile];
      return f.length ? [f[f.length - 1]] : [];
    }
    return g.tableau[s.pile].slice(s.index);
  };

  const removeSelected = (g: GameState, s: Exclude<Sel, null>): Card[] => {
    if (s.kind === 'waste') return [g.waste.pop()!];
    if (s.kind === 'foundation') return [g.foundations[s.pile].pop()!];
    const run = g.tableau[s.pile].splice(s.index);
    const pile = g.tableau[s.pile];
    if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true;
    return run;
  };

  const clickStock = () => {
    const g = clone(game);
    if (g.stock.length === 0) {
      if (g.waste.length === 0) return;
      g.stock = g.waste.reverse().map((c) => ({ ...c, faceUp: false }));
      g.waste = [];
    } else {
      const c = g.stock.pop()!;
      g.waste.push({ ...c, faceUp: true });
    }
    commit(g);
  };

  const tryTableau = (target: number) => {
    if (!sel) return false;
    const movingPreview = selectedCards(game, sel);
    if (movingPreview.length === 0) return false;
    const first = movingPreview[0];
    const pile = game.tableau[target];
    const top = pile[pile.length - 1];
    const legal = top
      ? top.faceUp && top.rank === first.rank + 1 && isRed(top.suit) !== isRed(first.suit)
      : first.rank === 13;
    if (!legal) return false;
    const g = clone(game);
    const moving = removeSelected(g, sel);
    g.tableau[target].push(...moving);
    commit(g);
    return true;
  };

  const tryFoundation = (target: number, source?: Sel) => {
    const s = source ?? sel;
    if (!s) return false;
    const moving = selectedCards(game, s);
    if (moving.length !== 1) return false;
    const card = moving[0];
    const f = game.foundations[target];
    const legal = f.length === 0 ? card.rank === 1 : f[f.length - 1].suit === card.suit && f[f.length - 1].rank === card.rank - 1;
    if (!legal) return false;
    const g = clone(game);
    const taken = removeSelected(g, s);
    g.foundations[target].push(...taken);
    commit(g);
    return true;
  };

  const autoFoundation = (source: Sel) => {
    for (let f = 0; f < 4; f++) if (tryFoundation(f, source)) return;
  };

  const clickTableauCard = (p: number, i: number) => {
    const pile = game.tableau[p];
    const card = pile[i];
    if (!card.faceUp) return; // face-down cards flip automatically when exposed
    if (sel && tryTableau(p)) return;
    setSel({ kind: 'tableau', pile: p, index: i });
  };

  const sameSel = (a: Sel, b: Sel) => JSON.stringify(a) === JSON.stringify(b);

  return (
    <>
      <Toolbar style={{ gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <Button onClick={deal}>Deal</Button>
        <span style={{ fontSize: 13 }}>Moves: {moves}</span>
        <span style={{ fontSize: 13, marginLeft: 'auto', color: '#444' }}>
          click to pick up · click to place · double-click sends up
        </span>
      </Toolbar>
      <Felt style={{ marginTop: 4, position: 'relative' }}>
        <TopRow>
          {/* Stock */}
          {game.stock.length > 0 ? (
            <CardBox $back onClick={clickStock} title="Draw" />
          ) : (
            <Slot onClick={clickStock}>↺</Slot>
          )}
          {/* Waste */}
          {game.waste.length > 0 ? (
            <CardView
              card={game.waste[game.waste.length - 1]}
              selected={sameSel(sel, { kind: 'waste' })}
              onClick={() => setSel({ kind: 'waste' })}
              onDoubleClick={() => autoFoundation({ kind: 'waste' })}
            />
          ) : (
            <Slot />
          )}
          <div style={{ width: CARD_W }} />
          {/* Foundations */}
          {game.foundations.map((f, i) =>
            f.length > 0 ? (
              <CardView
                key={i}
                card={f[f.length - 1]}
                selected={sameSel(sel, { kind: 'foundation', pile: i })}
                onClick={() => {
                  if (sel && tryFoundation(i)) return;
                  setSel({ kind: 'foundation', pile: i });
                }}
              />
            ) : (
              <Slot key={i} onClick={() => sel && tryFoundation(i)}>
                {SUITS[i]}
              </Slot>
            ),
          )}
        </TopRow>
        <Columns>
          {game.tableau.map((pile, p) => (
            <div
              key={p}
              style={{
                position: 'relative',
                width: CARD_W,
                minHeight: CARD_H + 6 * FAN_DOWN + 12 * FAN_UP,
              }}
            >
              {pile.length === 0 && <Slot onClick={() => sel && tryTableau(p)} />}
              {(() => {
                let y = 0;
                return pile.map((card, i) => {
                  const top = y;
                  y += card.faceUp ? FAN_UP : FAN_DOWN;
                  const selHere =
                    sel?.kind === 'tableau' && sel.pile === p && i >= sel.index;
                  return (
                    <CardView
                      key={`${card.suit}-${card.rank}`}
                      card={card}
                      selected={selHere}
                      style={{ position: 'absolute', top, left: 0 }}
                      onClick={() => clickTableauCard(p, i)}
                      onDoubleClick={
                        i === pile.length - 1
                          ? () => autoFoundation({ kind: 'tableau', pile: p, index: i })
                          : undefined
                      }
                    />
                  );
                });
              })()}
            </div>
          ))}
        </Columns>
        {won && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <Window style={{ width: 260 }}>
              <WindowHeader>Solitaire</WindowHeader>
              <WindowContent style={{ textAlign: 'center' }}>
                <p style={{ marginTop: 0 }}>You won in {moves} moves!</p>
                <Button onClick={deal} style={{ width: 110 }}>
                  Deal again
                </Button>
              </WindowContent>
            </Window>
          </div>
        )}
      </Felt>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        Stock: {game.stock.length} — Waste: {game.waste.length}
        {won ? ' — solved!' : ''}
      </Frame>
    </>
  );
}
