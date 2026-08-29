import { registerApp } from '../os/appRegistry';
import { FileExplorer } from './FileExplorer';
import { Notepad } from './Notepad';
import { PhotoViewer } from './PhotoViewer';
import { MailApp } from './MailApp';
import { BuddyLine } from './BuddyLine';
import { Browser } from './Browser';
import { RecycleBin } from './RecycleBin';
import { CardShark } from './CardShark';
import { CaseNotes } from './CaseNotes';
import { VoyagerSplash } from './VoyagerSplash';

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
    name: 'Jotter',
    icon: 'notepad',
    component: Notepad,
    defaultSize: { w: 520, h: 440 },
  });
  registerApp({
    id: 'photos',
    name: 'PicturePost Viewer',
    icon: 'photo',
    component: PhotoViewer,
    defaultSize: { w: 560, h: 480 },
  });
  registerApp({
    id: 'mail',
    name: 'WestWind Mail',
    icon: 'mail-app',
    component: MailApp,
    defaultSize: { w: 700, h: 520 },
    singleton: true,
  });
  registerApp({
    id: 'buddyline',
    name: 'BuddyLine',
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
    id: 'recycle',
    name: 'Recycle Bin',
    icon: 'trash',
    component: RecycleBin,
    defaultSize: { w: 540, h: 360 },
    singleton: true,
  });
  registerApp({
    id: 'cardshark',
    name: 'CardShark 2',
    icon: 'game',
    component: CardShark,
    defaultSize: { w: 340, h: 250 },
    singleton: true,
  });
  registerApp({
    id: 'casenotes',
    name: 'Case Notes',
    icon: 'notes',
    component: CaseNotes,
    defaultSize: { w: 420, h: 400 },
    singleton: true,
  });
}
