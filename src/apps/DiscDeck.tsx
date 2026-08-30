import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame } from 'react95';

// The album in the drive: Solar Flare — "Static Heart" (fictional, of course).
const TRACKS = [
  { n: 1, title: 'Static Heart', len: 214 },
  { n: 2, title: 'Carousel', len: 187 },
  { n: 3, title: 'Anywhere Fast', len: 243 },
  { n: 4, title: 'Reservoir Nights', len: 199 },
  { n: 5, title: 'Coin on the Tracks', len: 176 },
  { n: 6, title: 'Porch Light', len: 262 },
  { n: 7, title: 'FM Ghosts', len: 205 },
  { n: 8, title: 'Static Heart (reprise)', len: 88 },
];

const Led = styled(Frame).attrs({ variant: 'field' })`
  background: #001500;
  color: #30e030;
  font-family: 'Fixedsys', 'Courier New', monospace;
  font-size: 20px;
  padding: 4px 10px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
`;

const TrackRow = styled.button<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: none;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : 'inherit')};
  font-size: 13px;
  padding: 2px 8px;
  cursor: var(--cursor-arrow);
`;

function mmss(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function DiscDeck() {
  const [track, setTrack] = useState(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setPos((p) => {
        if (p + 1 >= TRACKS[track].len) {
          if (track < TRACKS.length - 1) {
            setTrack(track + 1);
            return 0;
          }
          setPlaying(false);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, track]);

  const go = (t: number) => {
    setTrack(Math.max(0, Math.min(TRACKS.length - 1, t)));
    setPos(0);
  };

  return (
    <>
      <Led>
        <span>
          {playing ? '▶' : '⏸'} TRACK {String(track + 1).padStart(2, '0')}
        </span>
        <span>{mmss(pos)}</span>
      </Led>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexShrink: 0 }}>
        <Button onClick={() => go(track - 1)}>⏮</Button>
        <Button active={playing} onClick={() => setPlaying(true)} style={{ width: 56 }}>
          Play
        </Button>
        <Button onClick={() => setPlaying(false)}>Pause</Button>
        <Button
          onClick={() => {
            setPlaying(false);
            setPos(0);
          }}
        >
          Stop
        </Button>
        <Button onClick={() => go(track + 1)}>⏭</Button>
      </div>
      <Frame variant="well" style={{ padding: '3px 8px', fontSize: 12, marginBottom: 4, flexShrink: 0 }}>
        Disc: SOLAR FLARE — <i>Static Heart</i> (Meridian Records, 1997)
      </Frame>
      <Frame variant="field" style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {TRACKS.map((t, i) => (
          <TrackRow key={t.n} $active={i === track} onDoubleClick={() => { go(i); setPlaying(true); }}>
            <span>
              {t.n}. {t.title}
            </span>
            <span>{mmss(t.len)}</span>
          </TrackRow>
        ))}
      </Frame>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        No audio output device found.
      </Frame>
    </>
  );
}
