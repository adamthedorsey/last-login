/**
 * Icon registry.
 *
 * DEMO EXCEPTION (owner call, temporary): most icons currently come from
 * @react95/icons — genuine Win95 art, fine for a demo, to be REPLACED with
 * original art before any commercial release. No Windows-flag icons are
 * used. The hand-drawn rect set below remains as the fallback and the
 * eventual replacement target.
 */
import {
  Appwiz1500,
  Calculator,
  Dialer1,
  CdMusic,
  Computer5,
  Computer,
  Desk100,
  Earth,
  KeyboardMouse,
  Mmsys110,
  Printer,
  FileFind,
  FilePen,
  FileText,
  Folder as FolderIcon,
  FolderFile,
  Wangimg128,
  Wangimg129,
  Freecell1,
  HelpBook,
  Mail,
  Mailnews2,
  Mailnews14,
  McmPhone,
  Mspaint,
  Notepad,
  RecycleEmpty,
  RecycleFile,
  RecycleFull,
  Progman2,
  Settings,
  Shell327,
  Shell329,
  Vvexe321,
  Warning,
  Sysmon1000,
  Textchat,
  Timedate,
  Timedate200,
  Winmine1,
  Winpopup2,
} from '@react95/icons';

type R95Component = React.ComponentType<{
  variant?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}>;

/** Component + whether it ships a 16x16 frame (not all of them do). Each
 * icon component types `variant` as its own narrow union, so the map is
 * cast once here rather than per-entry. */
const R95 = {
  browser: { C: Earth, v16: false },
  calc: { C: Calculator, v16: true },
  calendar: { C: Timedate200, v16: true },
  cd: { C: CdMusic, v16: true },
  clock: { C: Timedate, v16: true },
  computer: { C: Computer, v16: true },
  display: { C: Desk100, v16: true },
  doc: { C: FileText, v16: true },
  drive: { C: Shell329, v16: true },
  mycomputer: { C: Computer5, v16: false },
  floppy: { C: Shell327, v16: true },
  find: { C: FileFind, v16: true },
  folder: { C: FolderIcon, v16: true },
  'folder-docs': { C: FolderFile, v16: true },
  'folder-pics': { C: Wangimg128, v16: true },
  game: { C: Freecell1, v16: false },
  help: { C: HelpBook, v16: true },
  im: { C: Winpopup2, v16: true },
  'im-app': { C: Textchat, v16: true },
  mail: { C: Mail, v16: true },
  'mail-app': { C: Mailnews14, v16: true },
  mailbox: { C: Mailnews2, v16: true },
  'mailbox-trash': { C: RecycleFile, v16: false },
  mine: { C: Winmine1, v16: true },
  notepad: { C: Notepad, v16: true },
  notes: { C: FilePen, v16: true },
  paint: { C: Mspaint, v16: true },
  photo: { C: Wangimg129, v16: true },
  run: { C: Progman2, v16: false },
  settings: { C: Settings, v16: true },
  dos: { C: Vvexe321, v16: false },
  dialup: { C: McmPhone, v16: false },
  warning: { C: Warning, v16: false },
  sysmon: { C: Sysmon1000, v16: false },
  trash: { C: RecycleEmpty, v16: true },
  'trash-full': { C: RecycleFull, v16: true },
  phone: { C: Dialer1, v16: true },
  printer: { C: Printer, v16: true },
  mouse: { C: KeyboardMouse, v16: true },
  sounds: { C: Mmsys110, v16: true },
  addremove: { C: Appwiz1500, v16: true },
} as unknown as Record<string, { C: R95Component; v16: boolean }>;

interface IconProps {
  name?: string;
  size?: number;
  /** Win95 shortcut overlay: the little white box + black arrow, bottom-left. */
  shortcut?: boolean;
}

/** The .lnk arrow, drawn blocky in a 10x10 box. */
function ShortcutArrow({ size }: { size: number }) {
  const s = Math.max(10, Math.round(size * 0.38));
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
      style={{ position: 'absolute', left: 0, bottom: 0 }}
      aria-hidden
    >
      <rect x={0} y={0} width={10} height={10} fill="#ffffff" />
      {/* the corner-and-shaft arrow, bold enough to read at icon size */}
      <rect x={4} y={2} width={5} height={1} fill="#000" />
      <rect x={8} y={2} width={1} height={5} fill="#000" />
      <rect x={6} y={3} width={2} height={2} fill="#000" />
      <rect x={5} y={4} width={2} height={2} fill="#000" />
      <rect x={4} y={5} width={2} height={2} fill="#000" />
      <rect x={3} y={6} width={2} height={2} fill="#000" />
      <rect x={2} y={7} width={2} height={1} fill="#000" />
    </svg>
  );
}

type Px = [x: number, y: number, w: number, h: number, fill: string];

function px(list: Px[]) {
  return list.map(([x, y, w, h, fill], i) => (
    <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
  ));
}

const Y = '#f5d76a'; // folder yellow
const YD = '#c9a227';
const W = '#ffffff';
const GR = '#808080';
const NB = '#000080';
const TE = '#008080';

const ICONS: Record<string, Px[]> = {
  folder: [
    [2, 8, 12, 4, YD],
    [2, 10, 28, 18, YD],
    [3, 12, 26, 15, Y],
  ],
  'folder-docs': [
    [2, 8, 12, 4, YD],
    [2, 10, 28, 18, YD],
    [3, 12, 26, 15, Y],
    [10, 15, 12, 9, W],
    [12, 17, 8, 1, GR],
    [12, 19, 8, 1, GR],
    [12, 21, 8, 1, GR],
  ],
  'folder-pics': [
    [2, 8, 12, 4, YD],
    [2, 10, 28, 18, YD],
    [3, 12, 26, 15, Y],
    [9, 14, 14, 10, '#87ceeb'],
    [9, 20, 14, 4, '#2e8b57'],
    [12, 16, 3, 3, '#ffd700'],
  ],
  drive: [
    [3, 10, 26, 12, '#d4d0c8'],
    [3, 20, 26, 2, GR],
    [22, 14, 4, 2, '#00a000'],
    [6, 14, 12, 2, GR],
  ],
  computer: [
    [4, 4, 24, 16, '#d4d0c8'],
    [6, 6, 20, 12, TE],
    [8, 8, 10, 2, '#66cccc'],
    [12, 20, 8, 2, GR],
    [8, 22, 16, 4, '#d4d0c8'],
  ],
  doc: [
    [7, 3, 16, 26, W],
    [7, 3, 16, 1, GR],
    [7, 3, 1, 26, GR],
    [22, 3, 1, 26, GR],
    [7, 28, 16, 1, GR],
    [10, 8, 10, 1, NB],
    [10, 11, 10, 1, GR],
    [10, 14, 10, 1, GR],
    [10, 17, 7, 1, GR],
    [10, 20, 10, 1, GR],
  ],
  photo: [
    [4, 6, 24, 20, W],
    [6, 8, 20, 16, '#87ceeb'],
    [6, 18, 20, 6, '#2e8b57'],
    [10, 10, 4, 4, '#ffd700'],
  ],
  'mail-app': [
    [3, 8, 26, 16, '#e8e4d8'],
    [3, 8, 26, 2, GR],
    [3, 8, 2, 16, GR],
    [27, 8, 2, 16, GR],
    [3, 22, 26, 2, GR],
    [5, 10, 22, 2, '#c0392b'],
    [8, 12, 16, 8, W],
    [8, 12, 8, 4, '#dddddd'],
  ],
  mail: [
    [4, 9, 24, 14, W],
    [4, 9, 24, 1, GR],
    [4, 22, 24, 1, GR],
    [4, 9, 1, 14, GR],
    [27, 9, 1, 14, GR],
    [5, 10, 11, 6, '#eeeeee'],
    [16, 10, 11, 6, '#e0e0e0'],
  ],
  mailbox: [
    [6, 10, 20, 12, '#4a6fa5'],
    [6, 10, 20, 2, '#33507a'],
    [10, 14, 12, 4, W],
  ],
  'mailbox-trash': [
    [6, 10, 20, 12, GR],
    [6, 10, 20, 2, '#5a5a5a'],
    [10, 14, 12, 4, W],
  ],
  'im-app': [
    // two buddies, side by side
    [19, 4, 7, 7, '#4a6fa5'], // back buddy: head
    [16, 12, 13, 12, '#4a6fa5'], // back buddy: shoulders
    [18, 12, 9, 2, '#3a5a8a'], // shoulder shading
    [7, 8, 7, 7, '#e8c04a'], // front buddy: head
    [4, 16, 13, 12, '#e8c04a'], // front buddy: shoulders
    [6, 16, 9, 2, '#c9a227'], // shoulder shading
    [28, 6, 2, 2, W], // a little "online" spark
  ],
  im: [
    [4, 6, 24, 14, W],
    [4, 6, 24, 1, GR],
    [4, 19, 24, 1, GR],
    [4, 6, 1, 14, GR],
    [27, 6, 1, 14, GR],
    [8, 20, 4, 5, W],
    [7, 10, 14, 1, NB],
    [7, 13, 18, 1, GR],
    [7, 16, 10, 1, GR],
  ],
  browser: [
    // NetVoyager: a little sailing ship on the world-wide water
    [15, 2, 6, 2, '#c0392b'], // flag
    [15, 4, 2, 18, '#5a3a20'], // mast
    [18, 6, 4, 3, W], // main sail (billowing right)
    [18, 9, 6, 3, W],
    [18, 12, 8, 3, W],
    [18, 15, 9, 3, W],
    [10, 9, 4, 3, '#e0e0e0'], // fore sail (left)
    [8, 12, 6, 3, '#e0e0e0'],
    [7, 15, 7, 3, '#e0e0e0'],
    [5, 20, 22, 3, '#7a4a2a'], // hull
    [7, 23, 18, 3, '#5a3a20'],
    [2, 26, 28, 2, '#1a4a8a'], // water
    [4, 28, 7, 2, '#2a5a9a'],
    [15, 28, 7, 2, '#2a5a9a'],
    [2, 30, 28, 1, '#123a6a'],
  ],
  notepad: [
    [7, 3, 18, 26, W],
    [7, 3, 18, 2, '#4a6fa5'],
    [9, 9, 14, 1, GR],
    [9, 12, 14, 1, GR],
    [9, 15, 14, 1, GR],
    [9, 18, 9, 1, GR],
    [18, 20, 10, 10, '#f5d76a'],
    [18, 20, 10, 2, YD],
  ],
  trash: [
    [8, 8, 16, 20, '#d4d0c8'],
    [10, 10, 2, 16, GR],
    [15, 10, 2, 16, GR],
    [20, 10, 2, 16, GR],
    [6, 6, 20, 2, GR],
    [13, 3, 6, 3, GR],
  ],
  // The Mac-style full state: lid knocked ajar, crumpled paper over the rim.
  'trash-full': [
    // crumpled paper spilling out
    [9, 4, 5, 4, W],
    [15, 2, 6, 5, W],
    [12, 5, 8, 3, '#e8e8e8'],
    [21, 4, 3, 3, W],
    [10, 5, 2, 2, '#b8b8b8'],
    [17, 3, 2, 2, '#b8b8b8'],
    // the lid, shoved off to the side and resting on the pile
    [19, 0, 9, 2, GR],
    [24, 2, 4, 2, GR],
    // rim + body
    [6, 7, 20, 2, GR],
    [8, 9, 16, 19, '#d4d0c8'],
    [10, 11, 2, 15, GR],
    [15, 11, 2, 15, GR],
    [20, 11, 2, 15, GR],
  ],
  // magnifying glass (Find)
  find: [
    [10, 4, 8, 2, GR],
    [8, 6, 2, 2, GR],
    [18, 6, 2, 2, GR],
    [6, 8, 2, 6, GR],
    [20, 8, 2, 6, GR],
    [8, 14, 2, 2, GR],
    [18, 14, 2, 2, GR],
    [10, 16, 8, 2, GR],
    [10, 6, 8, 8, '#cfe0f5'],
    [18, 16, 3, 3, '#404040'],
    [20, 18, 3, 3, '#404040'],
    [22, 20, 4, 4, '#404040'],
  ],
  // the yellow help book with a purple question mark
  help: [
    [6, 6, 20, 20, '#f5d76a'],
    [6, 6, 20, 3, '#c9a227'],
    [6, 6, 3, 20, '#c9a227'],
    [13, 12, 7, 2, '#5b2d8e'],
    [18, 14, 2, 3, '#5b2d8e'],
    [15, 17, 3, 2, '#5b2d8e'],
    [15, 21, 3, 3, '#5b2d8e'],
  ],
  // a little window with a go-arrow (Run...)
  run: [
    [5, 7, 22, 16, W],
    [5, 7, 22, 3, '#000080'],
    [5, 7, 1, 16, GR],
    [26, 7, 1, 16, GR],
    [5, 22, 22, 1, GR],
    [10, 15, 8, 2, '#404040'],
    [16, 13, 2, 6, '#404040'],
    [18, 14, 2, 4, '#404040'],
    [20, 15, 2, 2, '#404040'],
  ],
  // blocky gear (Settings)
  settings: [
    [12, 5, 8, 4, GR],
    [5, 12, 4, 8, GR],
    [23, 12, 4, 8, GR],
    [12, 23, 8, 4, GR],
    [9, 9, 14, 14, '#a8a8a8'],
    [13, 13, 6, 6, '#404040'],
  ],
  game: [
    [6, 4, 14, 20, W],
    [6, 4, 14, 1, GR],
    [6, 23, 14, 1, GR],
    [6, 4, 1, 20, GR],
    [19, 4, 1, 20, GR],
    [10, 9, 6, 6, '#c0392b'],
    [12, 7, 2, 2, '#c0392b'],
    [12, 15, 2, 4, '#c0392b'],
    [12, 10, 14, 18, '#3a6ea5'],
    [13, 11, 12, 16, '#5a8ec5'],
  ],
  notes: [
    [6, 4, 20, 24, '#fffa9d'],
    [6, 4, 20, 2, '#d9d264'],
    [9, 10, 14, 1, GR],
    [9, 13, 14, 1, GR],
    [9, 16, 14, 1, GR],
    [9, 19, 8, 1, GR],
  ],
  calc: [
    [6, 3, 20, 26, '#d4d0c8'],
    [8, 5, 16, 6, '#0a2a0a'],
    [9, 6, 12, 3, '#30e030'],
    [8, 13, 4, 3, NB], [14, 13, 4, 3, NB], [20, 13, 4, 3, '#a03020'],
    [8, 18, 4, 3, NB], [14, 18, 4, 3, NB], [20, 18, 4, 3, '#a03020'],
    [8, 23, 4, 3, NB], [14, 23, 4, 3, NB], [20, 23, 4, 3, '#a03020'],
  ],
  calendar: [
    [4, 5, 24, 23, W],
    [4, 5, 24, 5, '#a03020'],
    [8, 3, 2, 4, GR], [22, 3, 2, 4, GR],
    [7, 13, 4, 3, GR], [13, 13, 4, 3, GR], [19, 13, 4, 3, GR],
    [7, 18, 4, 3, GR], [13, 18, 4, 3, NB], [19, 18, 4, 3, GR],
    [7, 23, 4, 3, GR], [13, 23, 4, 3, GR],
  ],
  mine: [
    [12, 8, 8, 16, '#222222'],
    [8, 12, 16, 8, '#222222'],
    [10, 10, 12, 12, '#222222'],
    [15, 4, 2, 4, '#222222'], [15, 24, 2, 4, '#222222'],
    [4, 15, 4, 2, '#222222'], [24, 15, 4, 2, '#222222'],
    [13, 12, 3, 3, W],
  ],
  paint: [
    [4, 20, 24, 8, '#d4d0c8'],
    [5, 21, 5, 5, '#c0392b'], [11, 21, 5, 5, '#2a6b3a'], [17, 21, 5, 5, NB], [23, 21, 4, 5, '#e8c04a'],
    [18, 4, 6, 6, '#7a4a2a'],
    [16, 9, 6, 6, '#a8763e'],
    [14, 13, 5, 5, '#c8b898'],
  ],
  cd: [
    [8, 4, 16, 2, '#c0c0d8'], [5, 6, 22, 2, '#c0c0d8'], [4, 8, 24, 16, '#c0c0d8'],
    [5, 24, 22, 2, '#c0c0d8'], [8, 26, 16, 2, '#c0c0d8'],
    [13, 13, 6, 6, '#8888aa'],
    [15, 15, 2, 2, W],
    [7, 9, 4, 3, '#e8e8ff'],
  ],
  display: [
    [4, 4, 24, 17, '#d4d0c8'],
    [6, 6, 20, 13, '#008080'],
    [8, 8, 7, 5, '#c76c9e'],
    [17, 8, 7, 5, '#2a6b3a'],
    [8, 14, 16, 3, '#e8c04a'],
    [12, 21, 8, 2, GR],
    [8, 23, 16, 4, '#d4d0c8'],
  ],
  sysmon: [
    [4, 4, 24, 17, '#d4d0c8'],
    [6, 6, 20, 13, '#0a1a0a'],
    [7, 15, 2, 3, '#30e030'], [10, 12, 2, 6, '#30e030'], [13, 9, 2, 9, '#30e030'],
    [16, 13, 2, 5, '#30e030'], [19, 8, 2, 10, '#30e030'], [22, 11, 2, 7, '#30e030'],
    [12, 21, 8, 2, GR],
    [8, 23, 16, 4, '#d4d0c8'],
  ],
  clock: [
    [10, 3, 12, 2, '#d4d0c8'], [6, 5, 20, 2, '#d4d0c8'], [4, 7, 24, 16, '#d4d0c8'],
    [6, 23, 20, 2, '#d4d0c8'], [10, 25, 12, 2, '#d4d0c8'],
    [8, 9, 16, 12, W],
    [15, 11, 2, 5, '#000000'],
    [17, 15, 4, 2, '#000000'],
  ],
};

export function Icon({ name = 'doc', size = 32, shortcut = false }: IconProps) {
  // The overlay only reads at desktop/explorer sizes; menus stay clean
  // (real Win95 Start menu items showed no arrows either).
  const withArrow = (inner: React.ReactNode) =>
    shortcut && size >= 24 ? (
      <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
        {inner}
        <ShortcutArrow size={size} />
      </span>
    ) : (
      inner
    );

  const R = R95[name];
  if (R) {
    // Serve the 16px frame when rendering small — it's the art Win95 drew
    // at that size, and it stays crisp instead of a shrunken 32px frame.
    const variant = size <= 20 && R.v16 ? '16x16_4' : '32x32_4';
    return withArrow(
      <R.C
        variant={variant}
        width={size}
        height={size}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />,
    );
  }
  const shape = ICONS[name] ?? ICONS.doc;
  return withArrow(
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
      aria-hidden
    >
      {px(shape)}
    </svg>,
  );
}
