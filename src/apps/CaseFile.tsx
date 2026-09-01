/**
 * Case Files — the evidence workspace the sheriff's office installed before
 * handing over the keyboard. The one diegetic channel between the player
 * and the case handler.
 *
 * First launch runs a 1997-style setup wizard. Its STORY pages (and every
 * memo, name, and subject) are engine-served handler content — this file is
 * pure chrome: generic install-speak, staged sync lines, transport buttons.
 * Setup completes server-side (caseFileSync needs the line up), so the
 * wizard runs exactly once per season, across reloads.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, Handle, Hourglass, MenuList, MenuListItem, Separator, Table, TableBody, TableDataCell, TableHead, TableHeadCell, TableRow, Window, WindowContent, WindowHeader } from 'react95';
import type { CaseFileView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { TASKBAR_HEIGHT, useWindowStore } from '../os/windowStore';
import { isMuted, startDiskChatter, stopDiskChatter } from '../os/sounds';
import { Icon } from '../os/icons';
import { StatusGrip } from '../os/StatusGrip';
import wizardArt from '../assets/images/humble-county-wizard.jpg';
import sealArt from '../assets/images/sheriff-seal.png';
import { OfflineAlert } from '../os/OfflineAlert';
import { openCaseNote } from './CaseNote';
import { CASE_TINT } from '../os/caseTheme';
import { CloseGlyph, TitleBarButton } from '../os/glyphs';
import { DOC_TEXT } from '../theme';

const SEEN_KEY = 'lastlogin.casefile.seen';
// Per-device flag: has this player finished the first-run setup wizard? Used
// only to choose the right loading placeholder — the "Opening Case Files..."
// loader must never flash BEFORE the wizard, only once setup is behind you.
const SETUP_DONE_KEY = 'lastlogin.casefile.setupDone';

/**
 * Handler lines are authored with hard breaks (typewriter width). In the
 * proportional reading pane, prose should fill the width — so join lines
 * within a paragraph, but keep blank-line breaks and any indented or
 * list-marker lines exactly as authored.
 */
function unwrapProse(text: string): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const prev = out[out.length - 1];
    const keepBreak =
      out.length === 0 ||
      prev === '' ||
      line === '' ||
      // A SHORT previous line ended on purpose (title, sign-off) — only
      // lines that ran to the typewriter margin were wrapped mid-thought.
      prev.length < 40 ||
      /^[\s]/.test(line) ||
      /^[-•\d]/.test(line.trim().slice(0, 1)) ||
      /^\[/.test(line) ||
      /^[—-] /.test(line);
    if (keepBreak) out.push(line);
    else out[out.length - 1] = `${prev} ${line}`;
  }
  return out.join('\n');
}

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** '1997-10-18' -> '10/18/97', the way a Win95 file list wrote dates. */
function shortDate(iso: string | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1].slice(2)}` : iso;
}

function loadSetupDone(): boolean {
  try {
    return localStorage.getItem(SETUP_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

const MenuRow = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  position: relative;
  padding-bottom: 2px;
`;

const MenuButton = styled.button<{ $open: boolean }>`
  border: none;
  background: ${(p) => (p.$open ? '#000080' : 'transparent')};
  color: ${(p) => (p.$open ? '#fff' : 'inherit')};
  padding: 2px 8px;
  font-size: 13px;
`;

const Drop = styled(MenuList)<{ $left: number }>`
  position: absolute;
  top: 20px;
  left: ${(p) => p.$left}px;
  z-index: 5000;
  min-width: 190px;
  font-size: 13px;
`;

/** Outlook-Express-style big toolbar buttons: icon on top, name below. */
const Ribbon = styled(Frame).attrs({ variant: 'well' })`
  display: flex;
  gap: 2px;
  padding: 3px 4px;
  flex-shrink: 0;
  margin-bottom: 4px;
`;

const RibbonButton = styled(Button)`
  width: 96px;
  height: 52px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 12px;
  padding: 2px;
`;

/** The app's identity band: the county software announcing itself — the
 * same black->teal as the title bar and the wizard banner, the seal, the
 * wordmark, and the CASE line. This is where the case title LIVES. */
const Masthead = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: linear-gradient(90deg, #000000, #14636a);
  border: 1px solid #000;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
`;

const Wordmark = styled.div`
  font-size: 19px;
  font-weight: bold;
  letter-spacing: 3px;
  white-space: nowrap;
`;

const CaseLine = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: #cfe3e0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  padding-left: 10px;
`;

const Agency = styled.div`
  font-size: 10px;
  letter-spacing: 1px;
  color: #9dc3bd;
  white-space: nowrap;
`;

/** The section tabs, folder-tab style — sharing one row with the pane's
 * action buttons (tabs left, buttons right, bottoms aligned). */
const NavRow = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-top: 6px;
  padding: 0 2px;
  align-items: flex-end;
`;

/** Manila folder tabs — the active one sits taller, bold, and fuses into
 * the sheet below; inactive tabs tuck behind, a shade deeper. */
const NavTab = styled.button<{ $active: boolean }>`
  border: 2px solid;
  border-color: #fbf8ee #6a6552 ${(p) => (p.$active ? CASE_TINT : '#6a6552')} #fbf8ee;
  border-bottom-width: ${(p) => (p.$active ? 0 : 2)}px;
  background: ${(p) => (p.$active ? CASE_TINT : '#d0c9ad')};
  padding: ${(p) => (p.$active ? '9px 20px 12px' : '7px 16px 6px')};
  font-size: 13px;
  /* Owner call: Case Files CONTENT and NAV read in Arial (app chrome —
     menus, ribbon, status — stays bitmap). */
  font-family: Arial, Helvetica, sans-serif;
  font-weight: ${(p) => (p.$active ? 'bold' : 'normal')};
  color: ${(p) => (p.$active ? '#000' : '#3d3a30')};
  margin-top: ${(p) => (p.$active ? 0 : 4)}px;
  position: relative;
  top: 2px;
  z-index: ${(p) => (p.$active ? 2 : 1)};
`;

const AboutOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100008;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
`;

const TitleBand = styled(Frame).attrs({ variant: 'well' })`
  padding: 4px 8px;
  font-size: 13px;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: bold;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Layout = styled.div<{ $wide?: boolean }>`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: ${(p) => (p.$wide ? '260px' : '190px')} 1fr;
  gap: 4px;
  margin-top: 4px;
`;

/** Evidence rows in the react95 Table — selectable, Win95 highlight. */
const EvRow = styled(TableRow)<{ $active: boolean }>`
  cursor: var(--cursor-arrow);
  ${(p) => (p.$active ? 'background: #000080 !important; color: #fff;' : '')}
  td {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const MemoList = styled(Frame).attrs({ variant: 'well' })`
  overflow: auto;
  padding: 4px;
  font-family: Arial, Helvetica, sans-serif;
  flex: 1;
  min-height: 0;
`;

const MemoRow = styled.button<{ $active: boolean; $unread: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: ${(p) => (p.$active ? '#000080' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : 'inherit')};
  padding: 3px 6px;
  font-size: 13px;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: ${(p) => (p.$unread ? 'bold' : 'normal')};
  cursor: var(--cursor-arrow);
  span {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  small {
    font-weight: normal;
    opacity: 0.7;
  }
`;

const Reading = styled(Frame).attrs({ variant: 'field' })`
  background: #fff;
  overflow: auto;
  padding: 10px 14px;
  user-select: text;
  ${DOC_TEXT}
  white-space: pre-wrap;
  /* In a flex column (the doc pane) the sheet fills the window and scrolls
     when the text runs long; as a grid cell this is inert. */
  flex: 1;
  min-height: 0;
`;

const MemoHead = styled.div`
  border-bottom: 1px solid #ccc;
  margin-bottom: 8px;
  padding-bottom: 6px;
  font-weight: bold;
`;

// --- The setup wizard (plain, institutional, 1997) ----------------------

const WizardBody = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  margin-top: 4px;
`;

/** The wizard's left art panel: the office's own banner, always full
 * width (never side-cropped); its own teal continues below when the
 * window is taller than the art. */
const ArtPanel = styled.div`
  border: 1px solid #000;
  background: #5c7a72 url(${wizardArt}) top center no-repeat;
  background-size: 100% auto;
  image-rendering: pixelated;
`;

const WizTitle = styled.div`
  font-family: 'Times New Roman', Times, serif;
  font-size: 26px;
  font-weight: bold;
  margin: 4px 0 12px;
`;

/** Reading-surface exception (same owner call as mail bodies): Arial
 * holds up aliased where the bitmap chrome font turns ragged in
 * paragraphs. The Times serif title above it is authentic Win95 Setup. */
const WizText = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
`;

const SyncWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 12px;
  padding: 8px 10px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  min-height: 84px;
  background: #fff;
`;

const WizRule = styled.div`
  height: 2px;
  border-top: 1px solid #808080;
  border-bottom: 1px solid #fff;
  margin: 10px 0 8px;
  flex-shrink: 0;
`;

const SYNC_LINES = [
  'Connecting...',
  'Verifying case access...',
  'Downloading case information...',
  'Retrieving messages...',
];
const SYNC_STEP_MS = 700;

export function CaseFile({ windowId, props }: { windowId: string; props?: Record<string, unknown> }) {
  const { send, view: gameView, contentEpoch, clearCaseAlert } = useGame();
  const openApp = useWindowStore((s) => s.open);
  const [file, setFile] = useState<CaseFileView | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>(loadSeen);
  const [setupDone, setSetupDone] = useState(loadSetupDone);

  // Wizard state. `page` counts through the server pages, then the sync
  // step. -1 = not in the wizard (normal workspace).
  const [page, setPage] = useState(0);
  const [syncStage, setSyncStage] = useState<'idle' | 'running' | 'offline' | 'done'>('idle');
  const [syncShown, setSyncShown] = useState(0);
  const [newCount, setNewCount] = useState(0);

  // Workspace chrome: menus, ribbon, dialogs, the status notice.
  type MenuName = 'file' | 'edit' | 'view' | 'help' | null;
  const [menuOpen, setMenuOpen] = useState<MenuName>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [offlineWarn, setOfflineWarn] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  // Voice playback (chrome only — the recording itself is served content).
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'broken' | 'muted'>('idle');

  const markSeen = (id: string) => {
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* per-player convenience only */
      }
      return next;
    });
  };

  const markSetupDone = () => {
    setSetupDone(true);
    try {
      localStorage.setItem(SETUP_DONE_KEY, '1');
    } catch {
      /* per-player convenience only */
    }
  };

  useEffect(() => {
    let canceled = false;
    void send({ type: 'getCaseFile' }).then((res) => {
      if (canceled || res.type !== 'casefile') return;
      setFile(res.view);
      // The messages are on screen (or will be) — the tray stops blinking.
      clearCaseAlert();
      if (!res.view.setup?.length) {
        markSetupDone();
        // Newest memo opens by default the first time it exists.
        setOpenId((prev) => {
          const id = prev ?? res.view.messages[res.view.messages.length - 1]?.id ?? null;
          if (id) markSeen(id);
          return id;
        });
      }
    });
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearCaseAlert is stable
  }, [send, contentEpoch]);

  // Stop any playing recording when the window content changes/unmounts.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [openId],
  );

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayState('idle');
  };

  const playAudio = (src: string) => {
    stopAudio();
    if (isMuted()) {
      setPlayState('muted');
      return;
    }
    try {
      const a = new Audio(src);
      a.volume = 0.9;
      a.onended = () => setPlayState('idle');
      a.onerror = () => setPlayState('broken');
      audioRef.current = a;
      void a.play().then(
        () => setPlayState('playing'),
        () => setPlayState('broken'),
      );
    } catch {
      setPlayState('broken');
    }
  };

  // --- The sync step: staged theater, then the real engine call ---
  const runSync = () => {
    if (gameView && !gameView.online) {
      setSyncStage('offline');
      return;
    }
    setSyncStage('running');
    setSyncShown(1);
  };

  useEffect(() => {
    if (syncStage !== 'running') return;
    if (syncShown < SYNC_LINES.length) {
      const t = window.setTimeout(() => setSyncShown((n) => n + 1), SYNC_STEP_MS);
      return () => window.clearTimeout(t);
    }
    // All lines shown — do the real thing.
    const t = window.setTimeout(() => {
      void send({ type: 'caseFileSync' }).then((res) => {
        if (res.type !== 'casefile') return;
        if (res.offline) {
          // The line dropped under us mid-setup.
          setSyncStage('offline');
          return;
        }
        setFile(res.view);
        setNewCount(res.view.messages.filter((m) => !seen.includes(m.id)).length);
        setSyncStage('done');
      });
    }, SYNC_STEP_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seen is read once at completion
  }, [syncStage, syncShown, send]);

  // F5 refreshes — but only while Case Files is the front window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F5') return;
      const st = useWindowStore.getState();
      const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
      if (top?.id !== windowId) return;
      e.preventDefault();
      void send({ type: 'getCaseFile' }).then((res) => {
        if (res.type === 'casefile') setFile(res.view);
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send, windowId]);

  // --- The four sections ---
  type Section = 'messages' | 'notes' | 'evidence' | 'bookmarks' | 'summary';
  const [section, setSection] = useState<Section>('messages');

  // --- The player's own documents (notes + evidence copies) ---
  const [docs, setDocs] = useState<import('@gamecore/types.ts').ItemSummary[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  // Multi-select in the doc list (Win95 model): plain click selects one,
  // Ctrl/Cmd toggles, Shift ranges from the anchor. Delete acts on the lot.
  const [selIds, setSelIds] = useState<string[]>([]);
  const selAnchor = useRef<string | null>(null);
  const [docText, setDocText] = useState('');
  const [docName, setDocName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bmId, setBmId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // An evidence copy keeps its REAL filename — sourceId is the marker.
  const isCopy = (d: import('@gamecore/types.ts').ItemSummary) => !!d.meta?.sourceId;

  const fetchDocs = async () => {
    const res = await send({ type: 'listChildren', parentId: 'casefile' });
    if (res.type === 'children') {
      setDocs(res.items.filter((i) => i.editable && i.kind === 'document'));
    }
  };
  useEffect(() => {
    void fetchDocs();
    // A Case Note window saved (or anything else changed): the open doc's
    // text may be stale — re-read it so the reading pane tracks.
    if (docId) void openDoc(docId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEpoch]);

  // The Case Files receipt toast is a shortcut: opening (or refocusing)
  // through it lands directly on the saved copy in Evidence Copies. The
  // nonce makes each receipt click land, even for the same document.
  const revealDocId = props?.revealDocId as string | undefined;
  const revealNonce = props?.revealNonce as number | undefined;
  useEffect(() => {
    if (!revealDocId || !file || (file.setup?.length ?? 0) > 0) return;
    setSection('evidence');
    void openDoc(revealDocId); // full open — name + text, like a row click
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealDocId, revealNonce, file === null]);

  const openDoc = async (id: string) => {
    const res = await send({ type: 'open', itemId: id });
    if (res.type === 'open' && res.ok && res.item) {
      setDocId(res.item.id);
      setSelIds([res.item.id]);
      selAnchor.current = res.item.id;
      setDocName(res.item.name);
      setDocText(res.item.body?.text ?? '');
    }
  };

  /** Win95 list selection: plain / Ctrl-Cmd toggle / Shift range. */
  const rowClick = (e: React.MouseEvent, id: string, ids: string[]) => {
    if (e.shiftKey && selAnchor.current && ids.includes(selAnchor.current)) {
      const a = ids.indexOf(selAnchor.current);
      const b = ids.indexOf(id);
      const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      setSelIds(range);
      if (range.length === 1) void openDoc(range[0]);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      selAnchor.current = id;
      setSelIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        if (next.length === 1) void openDoc(next[0]);
        return next;
      });
      return;
    }
    void openDoc(id);
  };

  const deleteDocs = async () => {
    setConfirmDelete(false);
    const targets = selIds.length > 0 ? selIds : docId ? [docId] : [];
    if (targets.length === 0) return;
    for (const id of targets) await send({ type: 'deleteDocument', docId: id });
    setSelIds([]);
    setDocId(null);
    setDocName('');
    setDocText('');
    await fetchDocs();
    setNotice(targets.length === 1 ? 'Deleted.' : `Deleted ${targets.length} items.`);
  };

  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const playNote = (id: string, dataUrl: string) => {
    stopAudio();
    if (playingNoteId === id) {
      setPlayingNoteId(null);
      return;
    }
    try {
      const a = new Audio(dataUrl);
      a.onended = () => setPlayingNoteId(null);
      audioRef.current = a;
      void a.play().then(
        () => setPlayingNoteId(id),
        () => setNotice('The note could not be played.'),
      );
    } catch {
      setNotice('The note could not be played.');
    }
  };
  const deleteNote = async (id: string) => {
    stopAudio();
    setPlayingNoteId(null);
    await send({ type: 'deleteAudioNote', noteId: id });
    setNotice('Deleted.');
  };

  /** Jump to where the copied original lives on the frozen machine. */
  const locateOriginal = async (sourceId: string) => {
    const res = await send({ type: 'open', itemId: sourceId });
    if (res.type !== 'open' || !res.ok || !res.item) {
      setNotice('The original could not be located.');
      return;
    }
    const it = res.item;
    const os = useWindowStore.getState();
    switch (it.kind) {
      case 'email':
      case 'mailbox':
        os.open('mail');
        break;
      case 'trash_item':
        os.open('recycle');
        break;
      case 'webpage':
        if (it.meta?.url) os.open('browser', { props: { url: it.meta.url } });
        break;
      case 'photo':
        os.open('photos', { props: { folderId: it.parentId, itemId: it.id }, title: it.name });
        break;
      default:
        os.open('explorer', {
          props: { folderId: it.parentId ?? 'folder.c', selectId: it.id },
        });
    }
  };

  /** Copy the open document's text (the reading pane is not editable). */
  const copyDoc = () => {
    setMenuOpen(null);
    if (docText) void navigator.clipboard.writeText(docText);
  };

  const [guideOpen, setGuideOpen] = useState(false);

  const refetch = async () => {
    const res = await send({ type: 'getCaseFile' });
    if (res.type === 'casefile') setFile(res.view);
  };

  /** The ribbon's Check Server: real wire sweep, then a fresh case file. */
  const checkServer = async () => {
    setMenuOpen(null);
    setChecking(true);
    // The disk works the whole time the county's server is thinking.
    const chatter = startDiskChatter(0.7);
    try {
      // The case server takes as long as it takes: 2-5 seconds, different
      // every call (owner call — this wait may exceed the usual ceiling).
      const hold = 2000 + Math.random() * 3000;
      const [res] = await Promise.all([
        send({ type: 'checkMail' }),
        new Promise((r) => window.setTimeout(r, hold)),
      ]);
      if (res.type === 'net' && !res.online) {
        setOfflineWarn(true);
        return;
      }
      await refetch();
      setNotice('Case server checked.');
    } finally {
      stopDiskChatter(chatter);
      setChecking(false);
    }
  };

  const openMessage = () => file?.messages.find((m) => m.id === openId) ?? null;

  const copyText = () => {
    setMenuOpen(null);
    const m = openMessage();
    if (!m) return;
    try {
      void navigator.clipboard.writeText(m.text);
      setNotice('Copied to Clipboard.');
    } catch {
      setNotice('Copy failed.');
    }
  };

  // Win95 wizards were fixed dialogs — while setup runs, the window locks
  // to a small centered sheet; the workspace that follows is roomy and
  // resizable again.
  const wizardActive = (file?.setup?.length ?? 0) > 0 || syncStage === 'done';
  // Before the file loads we can't be certain, but a player who hasn't finished
  // setup is headed for the wizard — size the window to the wizard sheet up
  // front so it never opens workspace-wide and then snaps smaller. Once setup
  // is behind them the window grows to the roomy, resizable workspace.
  const wizardSized = wizardActive || (!file && !setupDone);
  useEffect(() => {
    const st = useWindowStore.getState();
    st.setResizable(windowId, !wizardSized);
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_HEIGHT;
    const [w, h] = wizardSized ? [700, 530] : [880, 640];
    st.setRect(windowId, {
      x: Math.max(8, Math.round((vw - w) / 2)),
      y: Math.max(8, Math.round((vh - h) / 2)),
      w: Math.min(w, vw - 16),
      h: Math.min(h, vh - 16),
    });
  }, [windowId, wizardSized]);

  const finishWizard = () => {
    // Land in the inbox with the newest message open (the briefing).
    const id = file?.messages[file.messages.length - 1]?.id ?? null;
    setOpenId(id);
    if (id) markSeen(id);
    markSetupDone();
    setSyncStage('idle');
  };

  // ----------------------------------------------------------------------

  if (!file) {
    // Only the returning-player path (setup already done) gets the workspace
    // loader. On a first launch the wizard is coming, so show a neutral blank
    // instead — never flash "Opening Case Files..." before the wizard.
    return (
      <Frame variant="well" style={{ flex: 1, padding: 12, fontSize: 13 }}>
        {setupDone ? 'Opening Case Files ...' : ''}
      </Frame>
    );
  }

  // The wizard runs while the engine says setup is pending (and until the
  // player clicks Finish on the completed sync).
  if (wizardActive) {
    const pages = file.setup ?? [];
    const onSyncStep = page >= pages.length;
    const current = onSyncStep ? null : pages[page];
    const finished = syncStage === 'done';

    return (
      <>
        <TitleBand>Case Files Setup</TitleBand>
        <WizardBody>
          <ArtPanel />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {finished ? (
              <>
                <WizTitle>Setup Complete</WizTitle>
                <WizText>
                  {'Case Files is ready.'}
                  {newCount > 0 &&
                    `\n\n${newCount} new message${newCount === 1 ? '' : 's'} received.`}
                </WizText>
              </>
            ) : onSyncStep ? (
              <>
                <WizTitle>Connect to Case Server</WizTitle>
                {syncStage === 'running' ? (
                  <SyncWell>
                    {SYNC_LINES.slice(0, syncShown).map((l) => (
                      <div key={l}>{l}</div>
                    ))}
                  </SyncWell>
                ) : (
                  <WizText>
                    {'Setup will now connect to the case server to retrieve\n'}
                    {'case information and messages.\n\n'}
                    {gameView?.online
                      ? 'The connection is up. Click Next to continue.'
                      : 'This computer is not connected. Connect to the\nInternet, then click Next.'}
                    {syncStage === 'offline' && !gameView?.online && (
                      <div style={{ marginTop: 10, color: '#802020' }}>
                        The case server could not be reached. Connect to the
                        Internet and try again.
                      </div>
                    )}
                    {!gameView?.online && (
                      <div style={{ marginTop: 12 }}>
                        <Button onClick={() => openApp('dialup')} style={{ width: 110 }}>
                          Connect...
                        </Button>
                      </div>
                    )}
                  </WizText>
                )}
              </>
            ) : (
              <>
                <WizTitle>{current?.title}</WizTitle>
                <WizText>{unwrapProse(current?.lines.join('\n') ?? '')}</WizText>
              </>
            )}
          </div>
        </WizardBody>
        <WizRule />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button
            disabled={finished || page === 0 || syncStage === 'running'}
            onClick={() => {
              setSyncStage('idle');
              setPage((p) => Math.max(0, p - 1));
            }}
            style={{ width: 90 }}
          >
            {'< Back'}
          </Button>
          {finished ? (
            <Button onClick={finishWizard} style={{ width: 90, fontWeight: 'bold' }}>
              Finish
            </Button>
          ) : (
            <Button
              disabled={syncStage === 'running'}
              onClick={() => {
                if (onSyncStep) runSync();
                else setPage((p) => p + 1);
              }}
              style={{ width: 90 }}
            >
              {'Next >'}
            </Button>
          )}
          <Button
            disabled={syncStage === 'running' || finished}
            onClick={() => useWindowStore.getState().windows.forEach((w) => {
              if (w.appId === 'casefile') useWindowStore.getState().close(w.id);
            })}
            style={{ width: 90, marginLeft: 8 }}
          >
            Cancel
          </Button>
        </div>
      </>
    );
  }

  const open = file.messages.find((m) => m.id === openId) ?? null;
  const sectionDocs = docs.filter((d) => (section === 'evidence') === isCopy(d));
  const online = gameView?.online === true;

  const switchSection = (to: Section) => {
    setMenuOpen(null);
    setSelIds([]);
    selAnchor.current = null;
    setSection(to);
  };

  const sectionIds = sectionDocs.map((d) => d.id);
  const multiSelected = selIds.filter((id) => sectionIds.includes(id));

  // The doc pane: action buttons on their own row (top), the open item's
  // name in its own bar beneath, then the list and the white sheet with
  // their tops ALIGNED — the sheet lines up with the sidebar like the
  // other tabs.
  const singleDoc = multiSelected.length <= 1 && docId && sectionDocs.some((d) => d.id === docId);
  const docSrc = singleDoc ? sectionDocs.find((d) => d.id === docId)?.meta?.sourceId : undefined;
  const selectedBm = (file?.bookmarks ?? []).find((b) => b.id === bmId);
  const docsPane = (
    <>
      <Layout $wide={section === 'evidence'}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {section === 'evidence' ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell style={{ textAlign: 'left', fontSize: 12 }}>Name</TableHeadCell>
                    <TableHeadCell style={{ textAlign: 'left', fontSize: 12, width: 74 }}>Date</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sectionDocs.map((d) => (
                    <EvRow
                      key={d.id}
                      $active={multiSelected.includes(d.id) || d.id === docId}
                      onClick={(e: React.MouseEvent) => rowClick(e, d.id, sectionIds)}
                    >
                      <TableDataCell>{d.name}</TableDataCell>
                      <TableDataCell>{shortDate(d.meta?.modifiedAt)}</TableDataCell>
                    </EvRow>
                  ))}
                </TableBody>
              </Table>
              {sectionDocs.length === 0 && (
                <div style={{ padding: 8, color: '#777', fontSize: 13, fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  (nothing saved yet — right-click any file on the computer and choose Save to Case Files)
                </div>
              )}
            </div>
          ) : (
        <MemoList>
          {sectionDocs.map((d) => (
            <MemoRow
              key={d.id}
              $active={multiSelected.includes(d.id) || d.id === docId}
              $unread={false}
              onClick={(e) => rowClick(e, d.id, sectionIds)}
            >
              <span>{d.name}</span>
              <small>{d.meta?.modifiedAt ?? ''}</small>
            </MemoRow>
          ))}
          {sectionDocs.length === 0 && (
            <div style={{ padding: 8, color: '#777', fontSize: 13 }}>
              (no notes yet — use New Note)
            </div>
          )}
        </MemoList>
          )}
        </div>
        {/* Read-only — editing happens in the Case Note window. */}
        <Reading>
          {multiSelected.length > 1 ? (
            <span style={{ color: '#777' }}>{multiSelected.length} items selected.</span>
          ) : singleDoc ? (
            docText || <span style={{ color: '#777' }}>(empty)</span>
          ) : (
            <span style={{ color: '#777' }}>
              {section === 'notes' ? 'Select a note, or use New Note.' : 'Select a copy.'}
            </span>
          )}
        </Reading>
      </Layout>
    </>
  );

  return (
    <>
      <MenuRow ref={menuRef}>
        {(['file', 'edit', 'view', 'help'] as const).map((name) => (
          <MenuButton
            key={name}
            $open={menuOpen === name}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen((v) => (v === name ? null : name))}
            onMouseEnter={() => setMenuOpen((v) => (v ? name : v))}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </MenuButton>
        ))}
        {menuOpen === 'file' && (
          <Drop $left={0}>
            <MenuListItem size="sm" onClick={() => { setMenuOpen(null); openCaseNote(); }}>
              New Note
            </MenuListItem>
            <MenuListItem
              size="sm"
              disabled={!docId}
              onClick={docId ? () => { setMenuOpen(null); openCaseNote({ docId, name: docName }); } : undefined}
            >
              Edit Note
            </MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                useWindowStore.getState().close(windowId);
              }}
            >
              Close
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'edit' && (
          <Drop $left={38}>
            <MenuListItem size="sm" disabled>Cut</MenuListItem>
            <MenuListItem
              size="sm"
              disabled={section === 'summary' || (section !== 'messages' && !docId)}
              onClick={section === 'messages' ? copyText : copyDoc}
            >
              Copy
            </MenuListItem>
            <MenuListItem size="sm" disabled>Paste</MenuListItem>
          </Drop>
        )}
        {menuOpen === 'view' && (
          <Drop $left={78}>
            <MenuListItem size="sm" onClick={() => switchSection('messages')}>Messages</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('notes')}>Notes</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('evidence')}>Evidence Copies</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('bookmarks')}>Bookmarks</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('summary')}>Case Summary</MenuListItem>
            <Separator />
            <MenuListItem size="sm" onClick={() => void checkServer()}>
              Check for Updates
            </MenuListItem>
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                void refetch();
              }}
            >
              <span style={{ display: 'flex', width: '100%', gap: 18 }}>
                Refresh <span style={{ marginLeft: 'auto' }}>F5</span>
              </span>
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'help' && (
          <Drop $left={122}>
            <MenuListItem
              size="sm"
              disabled={(file.guide?.length ?? 0) === 0}
              onClick={() => {
                setMenuOpen(null);
                setGuideOpen(true);
              }}
            >
              Getting Started
            </MenuListItem>
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                setAboutOpen(true);
              }}
            >
              About Case Files...
            </MenuListItem>
          </Drop>
        )}
      </MenuRow>

      <Masthead>
        <img src={sealArt} alt="" style={{ width: 34, height: 34, imageRendering: 'pixelated' }} />
        <Wordmark>CASE FILES</Wordmark>
        <CaseLine>{file.title || '...'}</CaseLine>
        <Agency>HUMBLE COUNTY{'\n'}SHERIFF'S OFFICE</Agency>
      </Masthead>

      <Ribbon>
        <RibbonButton onClick={() => void checkServer()}>
          <Icon name="mail-app" size={22} />
          Check Server
        </RibbonButton>
        <Handle size={44} style={{ margin: '4px 5px' }} />
        <RibbonButton onClick={() => openCaseNote()}>
          <Icon name="notepad" size={22} />
          New Note
        </RibbonButton>
        <RibbonButton
          onClick={() => {
            setMenuOpen(null);
            useWindowStore.getState().open('soundrec', { props: { record: true } });
          }}
        >
          <Icon name="audio" size={22} />
          Record Note
        </RibbonButton>
        <RibbonButton onClick={() => switchSection('summary')}>
          <Icon name="notes" size={22} />
          Case Summary
        </RibbonButton>
        <RibbonButton disabled>
          <Icon name="printer" size={22} />
          Print
        </RibbonButton>
        {checking && (
          <span style={{ marginLeft: 'auto', alignSelf: 'center', paddingRight: 10 }}>
            <Hourglass size={28} />
          </span>
        )}
      </Ribbon>

      <NavRow>
        {(
          [
            ['messages', 'Messages'],
            ['notes', 'Notes'],
            ['evidence', 'Evidence Copies'],
            ['bookmarks', 'Bookmarks'],
          ] as const
        ).map(([id, label]) => (
          <NavTab key={id} $active={section === id} onClick={() => switchSection(id)}>
            {label}
          </NavTab>
        ))}
        <span
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            paddingBottom: 3,
          }}
        >
          {(section === 'notes' || section === 'evidence') && (
            <>
              {docSrc && (
                <Button onClick={() => void locateOriginal(docSrc)} style={{ padding: '0 12px' }}>
                  Locate Original
                </Button>
              )}
              <Button
                disabled={!singleDoc}
                onClick={singleDoc ? () => openCaseNote({ docId: docId!, name: docName }) : undefined}
                style={{ width: 70 }}
              >
                Edit
              </Button>
              <Button
                disabled={multiSelected.length === 0 && !singleDoc}
                onClick={multiSelected.length > 0 || singleDoc ? () => setConfirmDelete(true) : undefined}
                style={{ width: 70 }}
              >
                Delete
              </Button>
            </>
          )}
          {section === 'bookmarks' && (
            <>
              <Button
                disabled={!selectedBm}
                onClick={
                  selectedBm
                    ? () =>
                        useWindowStore.getState().open('browser', {
                          props: { url: selectedBm.url, urlNonce: Date.now() },
                        })
                    : undefined
                }
                style={{ padding: '0 12px' }}
              >
                Open in NetVoyager
              </Button>
              <Button
                disabled={!selectedBm}
                onClick={
                  selectedBm
                    ? () => {
                        void send({ type: 'deleteBookmark', bookmarkId: selectedBm.id }).then((res) => {
                          if (res.type === 'casefile') {
                            setFile(res.view);
                            setBmId(null);
                            setNotice('Bookmark removed.');
                          }
                        });
                      }
                    : undefined
                }
                style={{ width: 70 }}
              >
                Delete
              </Button>
            </>
          )}
        </span>
      </NavRow>

      {section === 'messages' && (
        <Layout>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <MemoList>
            {file.messages
              .slice()
              .reverse()
              .map((m) => (
                <MemoRow
                  key={m.id}
                  $active={m.id === openId}
                  $unread={!seen.includes(m.id)}
                  onClick={() => {
                    setOpenId(m.id);
                    markSeen(m.id);
                  }}
                >
                  <span>{m.subject ?? '(no subject)'}</span>
                  <small>{m.date ?? ''}</small>
                </MemoRow>
              ))}
            {file.messages.length === 0 && (
              <div style={{ padding: 8, color: '#777', fontSize: 13 }}>(no messages on file)</div>
            )}
          </MemoList>
          </div>
          <Reading ref={readingRef}>
            {open ? (
              <>
                <MemoHead>
                  {open.from ? `FROM: ${open.from}\n` : ''}
                  {open.date ? `DATE: ${open.date}\n` : ''}
                  RE: {open.subject ?? '(no subject)'}
                </MemoHead>
                {open.audioSrc && (
                  <Frame
                    variant="well"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      marginBottom: 10,
                      fontSize: 13,
                      fontFamily: 'ms_sans_serif',
                    }}
                  >
                    <Icon name="sounds" size={20} />
                    {playState === 'playing' ? (
                      <Button size="sm" onClick={stopAudio} style={{ width: 64 }}>
                        Stop
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => playAudio(open.audioSrc!)} style={{ width: 64 }}>
                        Play
                      </Button>
                    )}
                    <span>
                      Voice recording
                      {playState === 'broken' && ' — could not be played. Transcript below.'}
                      {playState === 'muted' && ' — sound is muted (see the taskbar).'}
                    </span>
                  </Frame>
                )}
                {unwrapProse(open.text)}
              </>
            ) : (
              <span style={{ color: '#777' }}>Select a message.</span>
            )}
          </Reading>
        </Layout>
      )}

      {section === 'notes' && (file.audioNotes?.length ?? 0) > 0 && (
        <Frame variant="well" style={{ marginTop: 4, padding: 4, flexShrink: 0 }}>
          {(file.audioNotes ?? []).map((n) => (
            <div
              key={n.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px', fontSize: 13 }}
            >
              <Icon name="audio" size={18} />
              <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {n.name}
              </span>
              <span style={{ color: '#666', fontSize: 12 }}>{n.createdAt}</span>
              <Button size="sm" onClick={() => playNote(n.id, n.dataUrl)} style={{ width: 56 }}>
                {playingNoteId === n.id ? 'Stop' : 'Play'}
              </Button>
              <Button size="sm" onClick={() => void deleteNote(n.id)} style={{ width: 56 }}>
                Delete
              </Button>
            </div>
          ))}
        </Frame>
      )}

      {(section === 'notes' || section === 'evidence') && docsPane}

      {section === 'bookmarks' && (
        <Layout>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <MemoList>
              {(file.bookmarks ?? []).map((b) => (
                <MemoRow
                  key={b.id}
                  $active={b.id === bmId}
                  $unread={false}
                  onClick={() => setBmId(b.id)}
                >
                  <span>{b.title}</span>
                  <small>{b.url}</small>
                </MemoRow>
              ))}
              {(file.bookmarks ?? []).length === 0 && (
                <div style={{ padding: 8, color: '#777', fontSize: 13 }}>
                  (nothing bookmarked yet — use the Bookmark button in NetVoyager)
                </div>
              )}
            </MemoList>
          </div>
          <Reading>
            {selectedBm ? (
              <span style={{ color: '#555' }}>
                {selectedBm.url}
                {'\n'}Saved {selectedBm.addedAt}
              </span>
            ) : (
              <span style={{ color: '#777' }}>Select a bookmark.</span>
            )}
          </Reading>
        </Layout>
      )}

      {section === 'summary' && (
        <Reading style={{ flex: 1, minHeight: 0, marginTop: 4 }}>
          {(file.summary ?? ['(no summary on file)']).join('\n')}
        </Reading>
      )}

      <Frame
        variant="well"
        style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0, display: 'flex', position: 'relative' }}
      >
        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {notice ??
            (section === 'messages'
              ? `${file.messages.length} message(s) on file`
              : section === 'summary'
                ? file.title
                : section === 'bookmarks'
                  ? `${(file.bookmarks ?? []).length} bookmark(s)`
                  : `${sectionDocs.length} item(s)`)}
        </span>
        <span style={{ flexShrink: 0, padding: '0 14px 0 12px', borderLeft: '1px solid #888' }}>
          Case Server: {online ? 'Connected' : 'Offline'}
        </span>
        <StatusGrip />
      </Frame>

      {aboutOpen && (
        <AboutOverlay data-no-deskmenu onPointerDown={(e) => e.stopPropagation()}>
          <Window shadow style={{ width: 360 }}>
            <WindowHeader style={{ fontSize: 13 }}>About Case Files</WindowHeader>
            <WindowContent style={{ fontSize: 13, textAlign: 'center' }}>
              <img src={sealArt} alt="" style={{ width: 120, height: 'auto' }} />
              <p style={{ margin: '10px 0 2px', fontWeight: 'bold', fontSize: 15 }}>
                Case Files
              </p>
              <p style={{ margin: '0 0 8px' }}>Version 1.2</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#444' }}>
                © 1996 Meridian Digital Systems
              </p>
              <Button onClick={() => setAboutOpen(false)} style={{ width: 90 }}>
                OK
              </Button>
            </WindowContent>
          </Window>
        </AboutOverlay>
      )}

      {guideOpen && (
        <AboutOverlay data-no-deskmenu onPointerDown={(e) => e.stopPropagation()}>
          <Window shadow style={{ width: 460 }}>
            <WindowHeader style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>Getting Started</span>
              <TitleBarButton onClick={() => setGuideOpen(false)} aria-label="Close">
                <CloseGlyph />
              </TitleBarButton>
            </WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ maxHeight: 360, overflow: 'auto', paddingRight: 6 }}>
                {(file.guide ?? []).map((g) => (
                  <div key={g.title} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{g.title}</div>
                    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {unwrapProse(g.lines.join('\n'))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button onClick={() => setGuideOpen(false)} style={{ width: 90 }}>
                  OK
                </Button>
              </div>
            </WindowContent>
          </Window>
        </AboutOverlay>
      )}

      {confirmDelete && (
        <AboutOverlay data-no-deskmenu onPointerDown={(e) => e.stopPropagation()}>
          <Window shadow style={{ width: 340 }}>
            <WindowHeader style={{ fontSize: 13 }}>Confirm Delete</WindowHeader>
            <WindowContent style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon name="warning" size={32} />
                <p style={{ margin: 0 }}>
                  {selIds.length > 1
                    ? `Delete these ${selIds.length} items? They are yours — the deletion is permanent.`
                    : `Delete "${docName}"? This file is yours — the deletion is permanent.`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={() => void deleteDocs()} style={{ width: 80 }}>
                  Yes
                </Button>
                <Button onClick={() => setConfirmDelete(false)} style={{ width: 80 }}>
                  No
                </Button>
              </div>
            </WindowContent>
          </Window>
        </AboutOverlay>
      )}

      {offlineWarn && (
        <OfflineAlert
          title="Case Files"
          message="Case Files could not reach the case server. Connect to the Internet, then try again."
          onClose={() => setOfflineWarn(false)}
        />
      )}
    </>
  );
}
