import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, Separator, TextInput } from 'react95';
import type { ItemContent, ItemSummary, PageBlock, SearchResult } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const FONTS: Record<string, string> = {
  serif: "'Times New Roman', Times, serif",
  sans: 'Arial, Helvetica, sans-serif',
  mono: "'Courier New', monospace",
};

import { VoyagerLogo } from './VoyagerSplash';

const ThrobBox = styled(Frame).attrs({ variant: 'well' })`
  width: 40px;
  height: 40px;
  padding: 2px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
`;

// ---------------------------------------------------------------------------
// Toolbar icons (small original pixel art)
// ---------------------------------------------------------------------------

type Px = [number, number, number, number, string];
const T = '#2f7d5a'; // Netscape-ish green for the navigation arrows
const TD = '#14402c'; // arrow outline
const D = '#333333';

// Chunky single-polygon arrows (triangle head + shaft), like the era's toolbars.
const TOOL_POLYS: Record<string, Array<{ points: string; fill: string; stroke?: string }>> = {
  back: [{ points: '2,11 10,3 10,7.5 19,7.5 19,14.5 10,14.5 10,19', fill: T, stroke: TD }],
  forward: [{ points: '20,11 12,3 12,7.5 3,7.5 3,14.5 12,14.5 12,19', fill: T, stroke: TD }],
  reload: [{ points: '13,10 21,10 17,17', fill: T, stroke: TD }],
};

const TOOL_ICONS: Record<string, Px[]> = {
  reload: [
    [4, 4, 13, 3, T], [4, 4, 3, 10, T], [6, 14, 6, 3, T], [15, 7, 2, 2, T],
  ],
  home: [
    [10, 3, 2, 2, D], [8, 5, 6, 2, D], [6, 7, 10, 2, D], [4, 9, 14, 2, D],
    [6, 11, 10, 7, '#c8b898'], [9, 13, 4, 5, '#7a4a2a'],
  ],
  search: [
    [6, 5, 7, 7, '#ffffff'], [6, 5, 7, 2, '#88aacc'], [5, 4, 9, 1, D], [5, 12, 9, 1, D],
    [5, 4, 1, 9, D], [13, 4, 1, 9, D], [13, 12, 4, 4, D],
  ],
  guide: [
    [5, 4, 12, 14, '#2a6b3a'], [7, 6, 8, 10, '#e8e8d8'], [8, 8, 6, 1, D], [8, 10, 6, 1, D], [8, 12, 4, 1, D],
  ],
  print: [
    [6, 3, 10, 5, '#ffffff'], [4, 8, 14, 7, '#a8a8a8'], [6, 15, 10, 3, '#ffffff'], [14, 10, 2, 2, '#2a8a2a'],
  ],
  security: [
    [7, 9, 8, 8, '#c8a020'], [8, 5, 1, 4, D], [13, 5, 1, 4, D], [8, 4, 6, 2, D], [10, 12, 2, 3, D],
  ],
  stop: [
    [7, 4, 8, 14, '#b03030'], [4, 7, 14, 8, '#b03030'], [6, 9, 10, 3, '#ffffff'],
  ],
};

function ToolIcon({ name }: { name: string }) {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" shapeRendering="crispEdges" aria-hidden>
      {(TOOL_ICONS[name] ?? []).map(([x, y, w, h, f], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={f} />
      ))}
      {(TOOL_POLYS[name] ?? []).map((p, i) => (
        <polygon key={`p${i}`} points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={1} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Chrome layout
// ---------------------------------------------------------------------------

const MenuBarRow = styled.div`
  display: flex;
  gap: 2px;
  font-size: 13px;
  flex-shrink: 0;
  position: relative;
`;

const MenuButton = styled.button<{ $open: boolean }>`
  border: none;
  background: ${(p) => (p.$open ? '#000080' : 'transparent')};
  color: ${(p) => (p.$open ? '#fff' : 'inherit')};
  padding: 2px 8px;
  font-size: 13px;
  cursor: var(--cursor-arrow);
`;

const DropMenu = styled(MenuList)`
  position: absolute;
  /* Anchor to the menu button's left edge, flush under the bar — without
     an explicit left, the drop resolves to its static in-flow position
     and hangs ~20px right of its button. */
  left: 0;
  top: 19px;
  z-index: 6000;
  min-width: 180px;
  font-size: 13px;
`;

const NavRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 3px 2px;
  border-top: 1px solid #fff;
  border-bottom: 1px solid #888;
  flex-shrink: 0;
`;

const NavButton = styled.button`
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 46px;
  padding: 2px 4px 1px;
  font-size: 11px;
  cursor: var(--cursor-arrow);
  color: #222;
  &:hover:not(:disabled) {
    border: 1px outset #fff;
  }
  &:active:not(:disabled) {
    border: 1px inset #888;
  }
  &:disabled {
    color: #999;
    svg {
      opacity: 0.35;
      filter: grayscale(1);
    }
  }
`;

const LocationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 2px;
  border-bottom: 1px solid #888;
  flex-shrink: 0;
  font-size: 13px;
`;

const Page = styled(Frame).attrs({ variant: 'field' })`
  flex: 1;
  min-height: 0;
  overflow: auto;
  user-select: text;
  padding: 0;
  margin-top: 3px;
  /* Web-page text is Times/Arial — smooth it for comfortable reading. */
`;

const StatusRow = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 4px;
  padding: 2px 6px;
  font-size: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressTrack = styled.div`
  margin-left: auto;
  width: 90px;
  height: 12px;
  border: 1px inset #888;
  background: #fff;
  overflow: hidden;
`;

const slide = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(300%); }
`;

const ProgressChunk = styled.div`
  width: 33%;
  height: 100%;
  background: #000080;
  animation: ${slide} 0.8s linear infinite;
`;

const scroll = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(-100%); }
`;

const MarqueeOuter = styled.div`
  overflow: hidden;
  white-space: nowrap;
`;

const MarqueeInner = styled.div`
  display: inline-block;
  animation: ${scroll} 14s linear infinite;
`;

const CounterBox = styled.span`
  display: inline-block;
  background: #000;
  color: #7cfc00;
  font-family: 'Courier New', monospace;
  padding: 2px 6px;
  letter-spacing: 2px;
  border: 2px inset #888;
`;

const ImgPlaceholder = styled.div`
  border: 1px dashed #999;
  background: rgba(128, 128, 128, 0.12);
  padding: 22px 14px;
  font-size: 12px;
  font-style: italic;
  margin: 10px auto;
  max-width: 420px;
`;

/** A picture that hasn't come down the wire yet: the era's empty frame
 * with the little placeholder glyph in the corner. Snaps to content. */
const ImgPending = styled.div`
  border: 1px solid #999;
  background: rgba(255, 255, 255, 0.85);
  width: 200px;
  height: 110px;
  margin: 10px auto;
  display: flex;
  align-items: flex-start;
  padding: 4px;
`;

function PendingGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden>
      <rect x={1} y={1} width={18} height={18} fill="#fff" stroke="#888" />
      <rect x={4} y={4} width={5} height={4} fill="#c03030" />
      <rect x={11} y={5} width={5} height={5} fill="#3050b0" />
      <rect x={4} y={11} width={12} height={5} fill="#2a8a2a" />
    </svg>
  );
}

/**
 * Staged page load: which leading blocks are on screen, and how many of the
 * page's images have "arrived". `null` means fully loaded (the default for
 * everything that isn't a freshly-visited page).
 */
interface Reveal {
  blocks: number;
  images: number;
}

// --- 1997 web furniture ------------------------------------------------------

const blinker = keyframes`
  50% { visibility: hidden; }
`;

const BlinkText = styled.div`
  font-weight: bold;
  margin: 8px 0;
  animation: ${blinker} 1s steps(1) infinite;
`;

const Badge = styled.span`
  display: inline-block;
  width: 88px;
  height: 31px;
  line-height: 29px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.5px;
  text-align: center;
  color: #fff;
  border: 2px outset #ddd;
  margin: 2px;
  overflow: hidden;
  vertical-align: middle;
`;

const BADGE_COLORS = ['#183a8a', '#7a1030', '#0a5a30', '#5a2a7a', '#8a5a10', '#101010'];

const RingBox = styled.div`
  border: 2px ridge #888;
  padding: 6px 12px;
  margin: 16px auto 8px;
  max-width: 420px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  text-align: center;
  background: rgba(255, 255, 255, 0.85);
  color: #111;
`;

const Stripes = styled.div`
  height: 18px;
  margin: 12px auto;
  max-width: 440px;
  background: repeating-linear-gradient(-45deg, #f0c000 0 12px, #111 12px 24px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

/** Tiled page backgrounds via inline SVG — the GeoCities look, zero assets. */
function tileCss(tile?: string): React.CSSProperties {
  const svg = (body: string, w = 40, h = 40) => ({
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`,
    )}")`,
  });
  switch (tile) {
    case 'stars':
      return svg(`<rect width='40' height='40' fill='#000022'/><circle cx='8' cy='9' r='1.3' fill='#fff'/><circle cx='30' cy='20' r='1' fill='#aaf'/><circle cx='18' cy='33' r='1.4' fill='#ffc'/>`);
    case 'clouds':
      return svg(`<rect width='60' height='40' fill='#aad4f0'/><ellipse cx='20' cy='16' rx='14' ry='7' fill='#fff' opacity='.9'/><ellipse cx='45' cy='30' rx='11' ry='6' fill='#fff' opacity='.75'/>`, 60);
    case 'plaid':
      return svg(`<rect width='40' height='40' fill='#e8e0d0'/><rect width='40' height='8' y='6' fill='#c05050' opacity='.4'/><rect width='8' height='40' x='6' fill='#4050a0' opacity='.35'/>`);
    case 'marble':
      return svg(`<rect width='60' height='60' fill='#d8d8d8'/><path d='M0 20 Q20 8 34 22 T60 18' stroke='#b8b8b8' fill='none'/><path d='M0 44 Q26 34 44 48 T60 40' stroke='#c4c4c4' fill='none'/>`, 60, 60);
    case 'hearts':
      return svg(`<rect width='44' height='44' fill='#ffe4ee'/><text x='6' y='18' font-size='12'>💗</text><text x='26' y='38' font-size='9'>💗</text>`, 44, 44);
    case 'grid':
      return svg(`<rect width='24' height='24' fill='#f4f4f4'/><path d='M0 0H24M0 0V24' stroke='#c8d8c8'/>`, 24, 24);
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// about: page (fictional homage to a 90s about screen)
// ---------------------------------------------------------------------------

function AboutPage() {
  const link = { color: '#0000cc', textDecoration: 'underline' };
  return (
    <div style={{ fontFamily: FONTS.serif, padding: '18px 30px', background: '#fff', minHeight: '100%' }}>
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'center' }}>
          <VoyagerLogo size={96} />
          <div style={{ letterSpacing: 6, marginTop: 6, fontSize: 20 }}>VOYAGER</div>
        </div>
        <div>
          <h1 style={{ fontSize: 28, margin: '0 0 10px' }}>
            NetVoyager<span style={{ fontSize: 14, verticalAlign: 'super' }}>®</span> Communicator 3.0
          </h1>
          <p style={{ fontSize: 13, margin: '6px 0' }}>
            Copyright © 1994-1997 Voyager Communications Corporation, All rights reserved.
          </p>
          <p style={{ fontSize: 13, margin: '6px 0' }}>
            This software is subject to the license agreement set forth in the{' '}
            <span style={link}>license</span>. Please read and agree to all terms before using this
            software.
          </p>
          <p style={{ fontSize: 13, margin: '6px 0' }}>
            NetVoyager and the comet logo are trademarks of Voyager Communications Corporation in
            the town of Humble, West Virginia and possibly other places. Other product and brand names are
            trademarks of their respective owners, whoever they may be.
          </p>
        </div>
      </div>
      <hr style={{ margin: '16px 0', borderStyle: 'inset' }} />
      <div style={{ display: 'flex', gap: 30, fontFamily: 'Arial, sans-serif', fontSize: 11.5 }}>
        <div style={{ width: 200 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#4a1010',
              color: '#e8c060',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              marginBottom: 6,
            }}
          >
            ☕
          </div>
          Powered by <span style={link}>Kava™</span> technology from{' '}
          <span style={link}>Helios Microsystems, Inc.</span> Kava and the Kava steam logo are
          trademarks of Helios Microsystems, Inc.
        </div>
        <div style={{ width: 220 }}>
          May contain Cosmoid™ software developed by <span style={link}>Prism Graphics, Inc.</span>{' '}
          Copyright © 1995-1997 Prism Graphics, Inc. Cosmoid-based marks are trademarks of Prism
          Graphics, Inc.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structured page renderer — blocks only, never raw HTML (no XSS surface).
// ---------------------------------------------------------------------------

/**
 * The SearchHound query form — mid-90s engine style: scope and display
 * dropdowns (decorative, like the era's), a wide box, and a Submit button.
 */
function SearchHoundForm({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState('');
  const selectStyle: React.CSSProperties = {
    fontSize: 13,
    fontFamily: 'Arial, Helvetica, sans-serif',
    border: '1px solid #888',
    background: '#e8e8e8',
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim() && onSearch) onSearch(q.trim());
      }}
      style={{ margin: '12px 0 8px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13 }}
    >
      <div style={{ marginBottom: 6 }}>
        Search{' '}
        <select style={selectStyle} defaultValue="web" aria-label="Search scope">
          <option value="web">the Web</option>
          <option value="news">Usenet</option>
          <option value="locker" disabled>
            your Locker (soon)
          </option>
        </select>{' '}
        and Display the Results{' '}
        <select style={selectStyle} defaultValue="standard" aria-label="Result format">
          <option value="standard">in Standard Form</option>
          <option value="compact">in Compact Form</option>
          <option value="detailed">in Detailed Form</option>
        </select>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          fontSize: 15,
          padding: '3px 6px',
          width: 340,
          maxWidth: '70%',
          border: '2px inset #888',
          fontFamily: "'Times New Roman', serif",
        }}
        aria-label="Search the web"
      />{' '}
      <button type="submit" style={{ fontSize: 13, padding: '3px 14px' }}>
        Submit
      </button>
    </form>
  );
}

function Blocks({
  page,
  reveal,
  onNavigate,
  onSearch,
}: {
  page: ItemContent;
  reveal: Reveal | null;
  onNavigate: (url: string) => void;
  onSearch?: (q: string) => void;
}) {
  const style = page.body?.style;

  // Stable top-down image ordinals, whether or not a block is on screen yet.
  let imgSeen = 0;

  return (
    <div
      style={{
        minHeight: '100%',
        backgroundColor: style?.bg ?? '#fff',
        ...tileCss(style?.bgTile),
        color: style?.fg ?? '#000',
        fontFamily: FONTS[style?.font ?? 'serif'],
        textAlign: style?.centered ? 'center' : 'left',
        padding: '18px 26px',
        fontSize: 16,
      }}
    >
      {page.body?.blocks?.map((b, i) => {
        const imgIdx = b.t === 'img' ? imgSeen++ : -1;
        if (reveal && i >= reveal.blocks) return null;
        if (imgIdx >= 0 && reveal && imgIdx >= reveal.images) {
          return (
            <ImgPending key={i}>
              <PendingGlyph />
            </ImgPending>
          );
        }
        return (
          <Block
            key={i}
            b={b}
            linkColor={style?.link ?? '#0000cc'}
            onNavigate={onNavigate}
            onSearch={onSearch}
          />
        );
      })}
    </div>
  );
}

function Block({
  b,
  linkColor,
  onNavigate,
  onSearch,
}: {
  b: PageBlock;
  linkColor: string;
  onNavigate: (url: string) => void;
  onSearch?: (q: string) => void;
}) {
  switch (b.t) {
    case 'searchform':
      return <SearchHoundForm onSearch={onSearch} />;
    case 'h':
      return <h1 style={{ fontSize: 30, margin: '10px 0' }}>{b.text}</h1>;
    case 'sub':
      return <h3 style={{ fontSize: 19, margin: '14px 0 6px' }}>{b.text}</h3>;
    case 'p':
      return <p style={{ margin: '8px 0', lineHeight: 1.5 }}>{b.text}</p>;
    case 'small':
      return <p style={{ fontSize: 12.5, opacity: 0.8, margin: '6px 0' }}>{b.text}</p>;
    case 'link':
      return (
        <p style={{ margin: '6px 0' }}>
          <a
            href="#"
            style={{ color: linkColor, textDecoration: 'underline' }}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(b.url);
            }}
          >
            {b.text}
          </a>
        </p>
      );
    case 'list':
      return (
        <ul style={{ display: 'inline-block', textAlign: 'left', margin: '8px 0' }}>
          {b.items.map((it, i) => (
            <li key={i} style={{ margin: '3px 0' }}>
              {it}
            </li>
          ))}
        </ul>
      );
    case 'hr':
      return <hr style={{ margin: '14px 0', borderStyle: 'inset' }} />;
    case 'img':
      return b.src ? (
        <img src={b.src} alt={b.caption} style={{ maxWidth: '100%', margin: '4px 0' }} />
      ) : (
        <ImgPlaceholder>{b.caption}</ImgPlaceholder>
      );
    case 'counter':
      return (
        <p>
          <CounterBox>{String(b.value).padStart(7, '0')}</CounterBox>
          <span style={{ fontSize: 12 }}> visitors</span>
        </p>
      );
    case 'marquee':
      return (
        <MarqueeOuter>
          <MarqueeInner>{b.text}</MarqueeInner>
        </MarqueeOuter>
      );
    case 'blink':
      return <BlinkText>{b.text}</BlinkText>;
    case 'divider': {
      const styles: Record<string, React.CSSProperties> = {
        rainbow: {
          height: 6,
          background:
            'linear-gradient(90deg, #f00 0 16%, #f90 16% 32%, #ff0 32% 48%, #0a0 48% 64%, #06f 64% 82%, #a0f 82% 100%)',
        },
        dots: {
          height: 8,
          background: 'radial-gradient(circle 3px at 8px 4px, currentColor 3px, transparent 3px)',
          backgroundSize: '16px 8px',
          opacity: 0.6,
        },
        zigzag: {
          height: 8,
          background:
            'linear-gradient(135deg, currentColor 25%, transparent 25%) 0 0/12px 8px, linear-gradient(45deg, transparent 75%, currentColor 75%) 0 0/12px 8px',
          opacity: 0.6,
        },
      };
      return <div style={{ margin: '14px auto', maxWidth: 440, ...styles[b.kind ?? 'rainbow'] }} />;
    }
    case 'construction':
      return (
        <Stripes>
          <span style={{ background: '#111', color: '#f0c000', fontSize: 11, fontWeight: 'bold', padding: '1px 8px', letterSpacing: 2, fontFamily: 'Arial, sans-serif' }}>
            ⚠ UNDER CONSTRUCTION ⚠
          </span>
        </Stripes>
      );
    case 'badges':
      return (
        <div style={{ margin: '10px 0' }}>
          {b.labels.map((label, i) => (
            <Badge key={i} style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}>
              {label}
            </Badge>
          ))}
        </div>
      );
    case 'webring':
      return (
        <RingBox>
          <b>{b.ring}</b>
          <br />
          [{' '}
          <a href="#" style={{ color: '#0000cc' }} onClick={(e) => { e.preventDefault(); onNavigate(b.prevUrl); }}>
            ← prev
          </a>{' '}
          |{' '}
          <a href="#" style={{ color: '#0000cc' }} onClick={(e) => { e.preventDefault(); onNavigate(b.nextUrl); }}>
            next →
          </a>{' '}
          ] — this site is proud to be part of the ring
        </RingBox>
      );
    case 'midi':
      return (
        <div style={{ display: 'inline-block', border: '2px inset #999', padding: '4px 10px', margin: '8px 0', fontFamily: "'Courier New', monospace", fontSize: 12, background: '#e8e8e8', color: '#222' }}>
          ♪ now playing: {b.file} — [■ stop] (it will not stop)
        </div>
      );
    case 'guestbook':
      return (
        <p style={{ margin: '8px 0', fontSize: 14 }}>
          📖{' '}
          <span style={{ textDecoration: 'underline' }}>Sign my Guestbook!</span> ·{' '}
          <span style={{ textDecoration: 'underline' }}>View Guestbook ({b.count} entries)</span>
        </p>
      );
    case 'updated':
      return (
        <p style={{ fontSize: 11, opacity: 0.75, margin: '10px 0 0', fontFamily: 'Arial, sans-serif' }}>
          This page was last updated {b.date}.
        </p>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// The browser
// ---------------------------------------------------------------------------

type ViewState =
  | { kind: 'blank' }
  | { kind: 'page'; page: ItemContent }
  | { kind: 'about' }
  | { kind: 'notfound'; url: string }
  | { kind: 'offline'; url: string }
  | { kind: 'results'; query: string; results: SearchResult[] };

interface MenuSpec {
  label: string;
  items: Array<{ label: string; action?: () => void; disabled?: boolean } | 'sep'>;
}

export function Browser({ windowId, props }: AppWindowProps) {
  const { send, view: gameView } = useGame();
  const setTitle = useWindowStore((s) => s.setTitle);
  const closeWindow = useWindowStore((s) => s.close);

  const [address, setAddress] = useState('');
  const [viewState, setViewState] = useState<ViewState>({ kind: 'blank' });
  const [status, setStatus] = useState('Ready.');
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [bookmarks, setBookmarks] = useState<ItemSummary[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const loadTimers = useRef<number[]>([]);

  const clearLoadTimers = useCallback(() => {
    for (const t of loadTimers.current) window.clearTimeout(t);
    loadTimers.current = [];
  }, []);
  useEffect(() => clearLoadTimers, [clearLoadTimers]);

  /**
   * The dial-up page load, 1997-honest: text arrives top-down in a few
   * chunks, then images fill their frames one at a time. Everything is
   * stepped (no easing), the whole act stays under ~2.5s, and a click
   * anywhere on the page finishes it instantly.
   */
  const stagePage = useCallback(
    (page: ItemContent, host: string) => {
      clearLoadTimers();
      const blocks = page.body?.blocks ?? [];
      const n = blocks.length;
      const imgs = blocks.filter((b) => b.t === 'img').length;
      if (n === 0) {
        setReveal(null);
        setLoading(false);
        setStatus('Document: Done');
        return;
      }
      setReveal({ blocks: Math.max(1, Math.ceil(n / 3)), images: 0 });
      setLoading(true);
      setStatus(`Transferring data from ${host} ...`);
      const at = (ms: number, fn: () => void) =>
        loadTimers.current.push(window.setTimeout(fn, ms));
      at(250, () => setReveal((r) => r && { ...r, blocks: Math.ceil((2 * n) / 3) }));
      at(500, () => setReveal((r) => r && { ...r, blocks: n }));
      // Bigger pages take visibly longer, but the last image is in by ~2.2s.
      const step = imgs > 1 ? Math.min(450, Math.floor(1300 / (imgs - 1))) : 0;
      for (let i = 0; i < imgs; i++) {
        at(850 + i * step, () => {
          setStatus(`Transferring image ${i + 1} of ${imgs} ...`);
          setReveal((r) => r && { ...r, images: i + 1 });
        });
      }
      at(imgs > 0 ? 850 + (imgs - 1) * step + 200 : 650, () => {
        setReveal(null);
        setLoading(false);
        setStatus('Document: Done');
      });
    },
    [clearLoadTimers],
  );

  /** A click mid-load completes the page instantly (the period guard). */
  const completeLoad = useCallback(() => {
    clearLoadTimers();
    setReveal(null);
    setLoading(false);
    setStatus('Document: Done');
  }, [clearLoadTimers]);

  /** Stop keeps whatever already arrived — empty frames stay empty. */
  const stopLoad = useCallback(() => {
    clearLoadTimers();
    setLoading(false);
    setStatus('Stopped.');
  }, [clearLoadTimers]);

  const backStack = useRef<string[]>([]);
  const fwdStack = useRef<string[]>([]);
  const locationRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const requestedUrl = props.url as string | undefined;
  const homeUrl = gameView?.homeUrl ?? 'www.searchhound.net';

  const brand = useCallback(
    (pageTitle?: string) => {
      setTitle(windowId, pageTitle ? `${pageTitle} - NetVoyager` : 'NetVoyager 3.0');
    },
    [setTitle, windowId],
  );

  const navigate = useCallback(
    async (url: string, push = true) => {
      const target = url.trim();
      setOpenMenu(null);
      if (/^about:?$/i.test(target)) {
        if (push && address) backStack.current.push(address);
        setAddress('about:');
        setViewState({ kind: 'about' });
        setStatus('Document: Done');
        brand('About NetVoyager');
        return;
      }
      clearLoadTimers();
      setReveal(null);
      setLoading(true);
      setStatus(`Connecting to ${target} ...`);
      const res = await send({ type: 'visit', url: target });
      // A moment of dial-up honesty before anything appears.
      await new Promise((r) => window.setTimeout(r, 200));
      if (push && address) backStack.current.push(address);
      if (push) fwdStack.current = [];
      setAddress(target);
      if (res.type === 'visit' && res.ok && res.page) {
        setViewState({ kind: 'page', page: res.page });
        brand(res.page.meta?.siteTitle ?? res.page.name);
        // Text arrives in chunks, images one at a time (see stagePage).
        stagePage(res.page, target.split('/')[0]);
      } else if (res.type === 'visit' && res.offline) {
        setLoading(false);
        setViewState({ kind: 'offline', url: target });
        setStatus('Not connected.');
        brand('Connection Failed');
      } else {
        setLoading(false);
        setViewState({ kind: 'notfound', url: target });
        setStatus('Unable to locate server.');
        brand('Not Found');
      }
    },
    [send, address, brand, clearLoadTimers, stagePage],
  );

  const search = useCallback(
    async (query: string) => {
      setLoading(true);
      setStatus(`Fetching results for "${query}" ...`);
      const res = await send({ type: 'search', query });
      await new Promise((r) => window.setTimeout(r, 220));
      setLoading(false);
      if (res.type === 'search' && res.offline) {
        setViewState({ kind: 'offline', url: 'www.searchhound.net' });
        setStatus('Not connected.');
        brand('Connection Failed');
      } else if (res.type === 'search') {
        setViewState({ kind: 'results', query, results: res.results });
        setStatus(`${res.results.length} result(s). Document: Done`);
        brand(`SearchHound: ${query}`);
      }
    },
    [send, brand],
  );

  useEffect(() => {
    void navigate(requestedUrl ?? homeUrl, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedUrl, props.urlNonce]);

  useEffect(() => {
    void send({ type: 'listChildren', parentId: 'folder.bookmarks' }).then((res) => {
      if (res.type === 'children') setBookmarks(res.items);
    });
  }, [send]);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openMenu]);

  const goBack = () => {
    const prev = backStack.current.pop();
    if (!prev) return;
    if (address) fwdStack.current.push(address);
    void navigate(prev, false);
  };

  const goForward = () => {
    const next = fwdStack.current.pop();
    if (!next) return;
    if (address) backStack.current.push(address);
    void navigate(next, false);
  };

  const reload = () => address && void navigate(address, false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (address.trim()) void navigate(address.trim());
  };

  const MENUS: MenuSpec[] = [
    {
      label: 'File',
      items: [
        { label: 'New Navigator Window', disabled: true },
        { label: 'Open Location...', action: () => locationRef.current?.select() },
        'sep',
        {
          label: 'Save Page to Case Files',
          disabled: viewState.kind !== 'page',
          action: () => {
            if (viewState.kind !== 'page') return;
            void send({ type: 'copyItem', itemId: viewState.page.id }).then((res) => {
              setStatus(
                res.type === 'document' && res.ok && res.item
                  ? `Saved to Case Files as "${res.item.name}"`
                  : 'This page could not be saved.',
              );
            });
          },
        },
        { label: 'Print...', disabled: true },
        'sep',
        { label: 'Close', action: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', disabled: true },
        { label: 'Copy', disabled: true },
        { label: 'Paste', disabled: true },
        'sep',
        { label: 'Find in Page...', disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Reload', action: reload },
        { label: 'Page Source', disabled: true },
        { label: 'Page Info', disabled: true },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', action: goBack, disabled: backStack.current.length === 0 },
        { label: 'Forward', action: goForward, disabled: fwdStack.current.length === 0 },
        { label: 'Home', action: () => void navigate(homeUrl) },
        // The history below is the machine's, not the player's: what Casey
        // browsed before she went missing, frozen — served by the engine,
        // exactly where Netscape kept it. Entries may point at pages that
        // "won't load" (the server enforces its own gating).
        ...(gameView?.browserHistory?.length
          ? ([
              'sep',
              ...gameView.browserHistory.map((h) => ({
                label: `${h.title}  (${h.at})`,
                action: () => void navigate(h.url),
              })),
            ] as MenuSpec['items'])
          : []),
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About NetVoyager...', action: () => void navigate('about:') }],
    },
  ];

  const navButtons: Array<{
    icon: string;
    label: string;
    action?: () => void;
    disabled?: boolean;
  }> = [
    { icon: 'back', label: 'Back', action: goBack, disabled: backStack.current.length === 0 },
    { icon: 'forward', label: 'Forward', action: goForward, disabled: fwdStack.current.length === 0 },
    { icon: 'reload', label: 'Reload', action: reload },
    { icon: 'home', label: 'Home', action: () => void navigate(homeUrl) },
    { icon: 'search', label: 'Search', action: () => void navigate('www.searchhound.net') },
    { icon: 'guide', label: 'Guide', action: () => void navigate('www.searchhound.net') },
    { icon: 'print', label: 'Print', disabled: true },
    { icon: 'security', label: 'Security', disabled: true },
    { icon: 'stop', label: 'Stop', disabled: !loading, action: stopLoad },
  ];

  let content: ReactNode;
  switch (viewState.kind) {
    case 'page':
      content = (
        <Blocks
          page={viewState.page}
          reveal={reveal}
          onNavigate={(u) => void navigate(u)}
          onSearch={(q) => void search(q)}
        />
      );
      break;
    case 'about':
      content = <AboutPage />;
      break;
    case 'offline':
      content = (
        <div style={{ padding: 26, fontFamily: FONTS.serif, background: '#fff', minHeight: '100%' }}>
          <h2>Unable to connect</h2>
          <p>
            NetVoyager could not open <b>{viewState.url}</b> because this
            computer is not connected to the Internet.
          </p>
          <p style={{ fontSize: 13, color: '#555' }}>
            Use <b>Dial-Up Networking</b> (WestWind Online on the desktop) to
            connect, then click Reload.
          </p>
        </div>
      );
      break;
    case 'notfound':
      content = (
        <div style={{ padding: 26, fontFamily: FONTS.serif, background: '#fff', minHeight: '100%' }}>
          <h2>Unable to locate server</h2>
          <p>
            NetVoyager cannot find the server <b>{viewState.url}</b>.
          </p>
          <p style={{ fontSize: 13, color: '#555' }}>
            Check the address, or the site may no longer exist. The web is a big place and parts of
            it fall off all the time.
          </p>
        </div>
      );
      break;
    case 'results':
      content = (
        <div style={{ padding: 22, fontFamily: FONTS.serif, background: '#fff', minHeight: '100%' }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              void navigate('www.searchhound.net');
            }}
          >
            <img src="/web/searchhound_logo.svg" alt="SearchHound" style={{ width: 320 }} />
          </a>
          <SearchHoundForm onSearch={(q) => void search(q)} />
          <hr style={{ borderStyle: 'inset' }} />
          <p style={{ fontStyle: 'italic', fontSize: 13, color: '#333' }}>
            {viewState.results.length === 0
              ? `No documents match the query: ${viewState.query}. Rex sniffed everywhere. He is sorry.`
              : `Documents 1-${viewState.results.length} of about ${viewState.results.length} matching the query: ${viewState.query}`}
          </p>
          {viewState.results.map((r, i) => (
            <div key={i} style={{ margin: '14px 0' }}>
              <a
                href="#"
                style={{ color: '#0000cc', fontSize: 17, textDecoration: 'underline' }}
                onClick={(e) => {
                  e.preventDefault();
                  void navigate(r.url);
                }}
              >
                {r.title}
              </a>
              <div style={{ fontSize: 13 }}>{r.snippet}</div>
              <div style={{ fontSize: 12, color: '#008000' }}>
                {r.url} — size 4K — 14-Oct-97
              </div>
            </div>
          ))}
          <hr style={{ borderStyle: 'inset', marginTop: 20 }} />
          <p style={{ fontSize: 11, fontFamily: 'Arial, sans-serif', color: '#666' }}>
            Result pages: 1 — that's all of them. SearchHound is a service of Meridian Digital
            Systems.
          </p>
        </div>
      );
      break;
    default:
      content = <div style={{ padding: 20 }}>Loading…</div>;
  }

  return (
    <>
      <MenuBarRow ref={menuRef}>
        {MENUS.map((m) => (
          <span key={m.label} style={{ position: 'relative' }}>
            <MenuButton
              $open={openMenu === m.label}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setOpenMenu(openMenu === m.label ? null : m.label)}
              onMouseEnter={() => openMenu && setOpenMenu(m.label)}
            >
              {m.label}
            </MenuButton>
            {openMenu === m.label && (
              <DropMenu>
                {m.items.map((it, i) =>
                  it === 'sep' ? (
                    <Separator key={i} />
                  ) : (
                    <MenuListItem
                      key={it.label}
                      disabled={it.disabled}
                      size="sm"
                      onClick={() => {
                        if (it.disabled) return;
                        setOpenMenu(null);
                        it.action?.();
                      }}
                    >
                      {it.label}
                    </MenuListItem>
                  ),
                )}
              </DropMenu>
            )}
          </span>
        ))}
      </MenuBarRow>

      <NavRow>
        {navButtons.map((b) => (
          <NavButton key={b.label} disabled={b.disabled} onClick={b.action} title={b.label}>
            <ToolIcon name={b.icon} />
            {b.label}
          </NavButton>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <ThrobBox>
            <VoyagerLogo size={32} sailing={loading} />
          </ThrobBox>
        </div>
      </NavRow>

      <LocationRow>
        <Button
          size="sm"
          active={openMenu === '@bookmarks'}
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          onClick={() => setOpenMenu(openMenu === '@bookmarks' ? null : '@bookmarks')}
        >
          🔖 Bookmarks
        </Button>
        <Button
          size="sm"
          disabled={viewState.kind !== 'page'}
          title="Save this page's address to Case Files"
          onClick={() => {
            if (viewState.kind !== 'page' || !address) return;
            void send({ type: 'saveBookmark', url: address }).then((res) => {
              setStatus(
                res.type === 'casefile'
                  ? 'Bookmarked to Case Files.'
                  : 'This page could not be bookmarked.',
              );
            });
          }}
        >
          Bookmark
        </Button>
        {openMenu === '@bookmarks' && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <DropMenu style={{ top: 14, left: -90 }}>
              {bookmarks.map((bm) => (
                <MenuListItem
                  key={bm.id}
                  size="sm"
                  onClick={() => {
                    setOpenMenu(null);
                    if (bm.meta?.url) void navigate(bm.meta.url);
                  }}
                >
                  {bm.name}
                </MenuListItem>
              ))}
            </DropMenu>
          </div>
        )}
        <span>Location:</span>
        <form onSubmit={submit} style={{ flex: 1, display: 'flex' }}>
          <TextInput
            ref={locationRef}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            spellCheck={false}
            style={{ flex: 1, height: 26 }}
          />
        </form>
      </LocationRow>

      <Page onPointerDown={loading && viewState.kind === 'page' ? completeLoad : undefined}>
        {content}
      </Page>

      <StatusRow>
        <span title="This document is not secure." style={{ display: 'inline-flex' }}>
          <svg width={12} height={12} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
            <rect x={2} y={6} width={8} height={5} fill="#808000" />
            <rect x={3} y={7} width={6} height={3} fill="#c0c000" />
            <rect x={6} y={1} width={5} height={1} fill="#404040" />
            <rect x={6} y={2} width={1} height={3} fill="#404040" />
            <rect x={10} y={2} width={1} height={2} fill="#404040" />
          </svg>
        </span>
        <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {status}
        </span>
        <ProgressTrack>{loading && <ProgressChunk />}</ProgressTrack>
      </StatusRow>
    </>
  );
}
