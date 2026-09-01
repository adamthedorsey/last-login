import { registerApp } from '../os/appRegistry';
import { FileExplorer } from './FileExplorer';
import { Notepad } from './Notepad';
import { PhotoViewer } from './PhotoViewer';
import { MailApp } from './MailApp';
import { Messenger } from './Messenger';
import { MessengerIM } from './MessengerIM';
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
import { PhoneDialer } from './PhoneDialer';
import {
  AddRemoveApplet,
  DateTimeApplet,
  MouseApplet,
  SoundsApplet,
  SystemApplet,
} from './ControlPanel';
import { SystemMonitor } from './SystemMonitor';
import { SoundRecorder } from './SoundRecorder';
import { DosPrompt } from './DosPrompt';
import { CdRom } from './CdRom';
import { SolBackdoor } from './SolBackdoor';
import { CaseFile } from './CaseFile';
import { CaseNote } from './CaseNote';
import { caseTheme } from '../os/caseTheme';
import { CaseFileSplash } from './CaseFileSplash';

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
    name: 'Messenger',
    icon: 'im-app',
    component: Messenger,
    // The AIM-style buddy list: tall and narrow, banner + roster + tools.
    defaultSize: { w: 260, h: 520 },
    singleton: true,
  });
  registerApp({
    id: 'im',
    name: 'Instant Message',
    icon: 'im',
    component: MessengerIM,
    // One IM window per buddy (deduped in os/messenger.ts). Not a
    // singleton — several conversations open at once, like the real thing.
    defaultSize: { w: 420, h: 380 },
    hidden: true,
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
    // Tall enough for the full dialing view: fields + the staged status
    // well (up to ~6 lines plus the hourglass) + the button row.
    defaultSize: { w: 400, h: 470 },
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
  registerApp({
    id: 'casefile',
    name: 'Case Files',
    icon: 'notes',
    component: CaseFile,
    // Roomy by default — the briefing should read like a document, not a
    // peephole. Fixed-size and centered, like the 1997 wizards it imitates.
    defaultSize: { w: 880, h: 640 },
    singleton: true,
    center: true,
    // Title bar matches the wizard banner: black into its teal — and the
    // whole window wears the county-issue manila tint.
    titleBar: { from: '#000000', to: '#14636a' },
    theme: caseTheme,
    splash: CaseFileSplash,
  });
  registerApp({
    id: 'casenote',
    name: 'Case Note',
    icon: 'notes',
    component: CaseNote,
    // The note editor rides in its own window — several may be open at
    // once — and wears the Case Files uniform (same black->teal bar).
    defaultSize: { w: 520, h: 420 },
    hidden: true,
    titleBar: { from: '#000000', to: '#14636a' },
    theme: caseTheme,
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
    id: 'soundrec',
    name: 'Sound Recorder',
    icon: 'audio',
    component: SoundRecorder,
    // The little fixed accessory, faithful to the original's footprint.
    defaultSize: { w: 360, h: 214 },
    resizable: false,
  });
  registerApp({
    id: 'cdrom',
    name: 'Summer_97 (D:)',
    icon: 'cd',
    component: CdRom,
    // Sized to show exactly the six songs; the rest of the disc lives
    // past the scrollbars.
    defaultSize: { w: 430, h: 340 },
    singleton: true,
    hidden: true,
  });
  registerApp({
    id: 'solbackdoor',
    name: 'porthole',
    icon: 'dos',
    component: SolBackdoor,
    // Opened only by the Solitaire knock; never in any menu.
    defaultSize: { w: 460, h: 300 },
    singleton: true,
    hidden: true,
  });
  registerApp({
    id: 'dosprompt',
    name: 'MT-DOS Prompt',
    icon: 'dos',
    component: DosPrompt,
    // COMMAND in a window — resizable, NOT a singleton (the real thing
    // happily ran several prompts at once). Hidden from the auto Programs
    // listing; the Start menu's hardcoded row (after the separator, the
    // Win95 way) is its home.
    defaultSize: { w: 640, h: 400 },
    hidden: true,
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
  registerApp({
    id: 'phonedialer',
    name: 'Phone Dialer',
    icon: 'phone',
    component: PhoneDialer,
    defaultSize: { w: 420, h: 430 },
    singleton: true,
  });
  // --- Control Panel applets ---
  registerApp({
    id: 'sysprops',
    resizable: false,
    name: 'System Properties',
    icon: 'computer',
    component: SystemApplet,
    defaultSize: { w: 380, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'datetime',
    resizable: false,
    name: 'Date/Time Properties',
    icon: 'clock',
    component: DateTimeApplet,
    defaultSize: { w: 400, h: 300 },
    singleton: true,
  });
  registerApp({
    id: 'sounds',
    resizable: false,
    name: 'Sounds Properties',
    icon: 'sounds',
    component: SoundsApplet,
    defaultSize: { w: 380, h: 380 },
    singleton: true,
  });
  registerApp({
    id: 'mouse',
    resizable: false,
    name: 'Mouse Properties',
    icon: 'mouse',
    component: MouseApplet,
    defaultSize: { w: 380, h: 330 },
    singleton: true,
  });
  registerApp({
    id: 'addremove',
    resizable: false,
    name: 'Add/Remove Programs',
    icon: 'addremove',
    component: AddRemoveApplet,
    defaultSize: { w: 420, h: 380 },
    singleton: true,
  });

  // Dev-only hook for automated window-size audits (dead-code-eliminated
  // from production builds).
  if (import.meta.env.DEV) {
    void import('../os/windowStore').then(({ useWindowStore }) => {
      void import('../os/appRegistry').then(({ listApps }) => {
        (window as unknown as Record<string, unknown>).__os = { useWindowStore, listApps };
      });
    });
  }
}
