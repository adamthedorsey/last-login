import { registerApp } from '../os/appRegistry';
import { FileExplorer } from './FileExplorer';
import { Notepad } from './Notepad';
import { PhotoViewer } from './PhotoViewer';
import { MailApp } from './MailApp';
import { BuddyLine } from './BuddyLine';
import { Browser } from './Browser';
import { RecycleBin } from './RecycleBin';
import { DialUp } from './DialUp';
import { Solitaire } from './Solitaire';
import { VoyagerSplash } from './VoyagerSplash';
import { Calculator } from './Calculator';
import { Calendar } from './Calendar';
import { Minefield } from './Minefield';
import { Paintbox } from './Paintbox';
import { DiscDeck } from './DiscDeck';
import { ClockApp } from './ClockApp';
import { Display } from './Display';
import { FindFiles } from './FindFiles';
import {
  AddRemoveApplet,
  DateTimeApplet,
  MouseApplet,
  SoundsApplet,
  SystemApplet,
} from './ControlPanel';
import { SystemMonitor } from './SystemMonitor';

export function registerAllApps(): void {
  registerApp({
    id: 'explorer',
    name: 'File Explorer',
    icon: 'drive',
    component: FileExplorer,
    defaultSize: { w: 560, h: 420 },
  });
  registerApp({
    id: 'notepad',
    name: 'Notepad',
    icon: 'notepad',
    component: Notepad,
    // Wide enough for the documents' longest authored line (70 chars) in
    // 15px Courier New — otherwise CSS re-wraps mid-sentence and reading
    // turns into a ragged stutter. Keep authored lines <= 70 chars.
    defaultSize: { w: 690, h: 460 },
  });
  registerApp({
    id: 'photos',
    name: 'Picture Viewer',
    icon: 'photo',
    component: PhotoViewer,
    defaultSize: { w: 560, h: 480 },
  });
  registerApp({
    id: 'mail',
    name: 'Mail',
    icon: 'mail-app',
    component: MailApp,
    defaultSize: { w: 700, h: 520 },
    singleton: true,
  });
  registerApp({
    id: 'buddyline',
    name: 'Chat',
    icon: 'im-app',
    component: BuddyLine,
    defaultSize: { w: 620, h: 460 },
    singleton: true,
  });
  registerApp({
    id: 'browser',
    name: 'NetVoyager 3.0',
    icon: 'browser',
    component: Browser,
    defaultSize: { w: 780, h: 580 },
    singleton: true,
    splash: VoyagerSplash,
  });
  registerApp({
    id: 'dialup',
    name: 'Dial-Up Networking',
    icon: 'dialup',
    component: DialUp,
    defaultSize: { w: 380, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'recycle',
    name: 'Recycle Bin',
    icon: 'trash',
    component: RecycleBin,
    defaultSize: { w: 540, h: 360 },
    singleton: true,
  });
  registerApp({
    id: 'solitaire',
    name: 'Solitaire',
    icon: 'game',
    component: Solitaire,
    defaultSize: { w: 640, h: 560 },
    singleton: true,
  });
  // --- Accessories (the Win95-style default apps) ---
  registerApp({
    id: 'calculator',
    name: 'Calculator',
    icon: 'calc',
    component: Calculator,
    defaultSize: { w: 300, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'calendar',
    name: 'Calendar',
    icon: 'calendar',
    component: Calendar,
    defaultSize: { w: 460, h: 460 },
    singleton: true,
  });
  registerApp({
    id: 'minefield',
    name: 'Minefield',
    icon: 'mine',
    component: Minefield,
    defaultSize: { w: 300, h: 400 },
    singleton: true,
  });
  registerApp({
    id: 'paintbox',
    name: 'Paint',
    icon: 'paint',
    component: Paintbox,
    defaultSize: { w: 520, h: 470 },
    singleton: true,
  });
  registerApp({
    id: 'discdeck',
    name: 'CD Player',
    icon: 'cd',
    component: DiscDeck,
    defaultSize: { w: 380, h: 420 },
    singleton: true,
  });
  registerApp({
    id: 'findfiles',
    name: 'Find: Files or Folders',
    icon: 'find',
    component: FindFiles,
    defaultSize: { w: 480, h: 430 },
    singleton: true,
  });
  registerApp({
    id: 'display',
    name: 'Display',
    icon: 'display',
    component: Display,
    defaultSize: { w: 380, h: 470 },
    singleton: true,
  });
  registerApp({
    id: 'sysmon',
    name: 'System Monitor',
    icon: 'sysmon',
    component: SystemMonitor,
    defaultSize: { w: 400, h: 430 },
    singleton: true,
  });
  registerApp({
    id: 'clock',
    name: 'Clock',
    icon: 'clock',
    component: ClockApp,
    defaultSize: { w: 300, h: 300 },
    singleton: true,
  });
  // --- Control Panel applets ---
  registerApp({
    id: 'sysprops',
    name: 'System Properties',
    icon: 'computer',
    component: SystemApplet,
    defaultSize: { w: 380, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'datetime',
    name: 'Date/Time Properties',
    icon: 'clock',
    component: DateTimeApplet,
    defaultSize: { w: 400, h: 300 },
    singleton: true,
  });
  registerApp({
    id: 'sounds',
    name: 'Sounds Properties',
    icon: 'sounds',
    component: SoundsApplet,
    defaultSize: { w: 380, h: 380 },
    singleton: true,
  });
  registerApp({
    id: 'mouse',
    name: 'Mouse Properties',
    icon: 'mouse',
    component: MouseApplet,
    defaultSize: { w: 380, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'addremove',
    name: 'Add/Remove Programs',
    icon: 'addremove',
    component: AddRemoveApplet,
    defaultSize: { w: 420, h: 380 },
    singleton: true,
  });
}
