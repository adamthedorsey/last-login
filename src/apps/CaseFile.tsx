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
import { Button, Frame, MenuList, MenuListItem, Separator, TextInput, Window, WindowContent, WindowHeader } from 'react95';
import type { CaseFileView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { TASKBAR_HEIGHT, useWindowStore } from '../os/windowStore';
import { isMuted } from '../os/sounds';
import { Icon } from '../os/icons';
import wizardArt from '../assets/images/humble-county-wizard.jpg';
import sealArt from '../assets/images/sheriff-seal.png';
import { OfflineAlert } from '../os/OfflineAlert';
import { CloseGlyph, TitleBarButton } from '../os/glyphs';
import { DOC_TEXT } from '../theme';

const SEEN_KEY = 'lastlogin.casefile.seen';

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
  width: 76px;
  height: 52px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 12px;
  padding: 2px;
`;

const RibbonSep = styled.div`
  width: 2px;
  margin: 3px 4px;
  border-left: 1px solid #808080;
  border-right: 1px solid #fff;
`;

/** The section tabs, folder-tab style. */
const NavRow = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-top: 4px;
  padding: 0 2px;
`;

const NavTab = styled.button<{ $active: boolean }>`
  border: 2px solid;
  border-color: #fff #404040 ${(p) => (p.$active ? '#d4d0c8' : '#404040')} #fff;
  border-bottom-width: ${(p) => (p.$active ? 0 : 2)}px;
  background: #d4d0c8;
  padding: ${(p) => (p.$active ? '4px 14px 6px' : '3px 12px')};
  font-size: 13px;
  font-family: inherit;
  margin-top: ${(p) => (p.$active ? 0 : 2)}px;
  position: relative;
  top: 2px;
`;

/** The plain-text note editor — Arial like every reading surface. */
const NotePaper = styled.textarea`
  flex: 1;
  min-height: 0;
  resize: none;
  border: 2px inset #888;
  background: #fff;
  padding: 8px 10px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  user-select: text;
  outline: none;
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
  font-weight: bold;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 4px;
  margin-top: 4px;
`;

const MemoList = styled(Frame).attrs({ variant: 'well' })`
  overflow: auto;
  padding: 4px;
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
`;

/** The ribbed size grip, drawn where Win95 drew it: in the status bar. */
const StatusGrip = styled.div`
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 13px;
  height: 13px;
  background: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    #808080 2px 3px,
    #ffffff 3px 4px
  );
  pointer-events: none;
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

export function CaseFile({ windowId }: { windowId: string }) {
  const { send, view: gameView, contentEpoch } = useGame();
  const openApp = useWindowStore((s) => s.open);
  const [file, setFile] = useState<CaseFileView | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>(loadSeen);

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

  useEffect(() => {
    let cancelled = false;
    void send({ type: 'getCaseFile' }).then((res) => {
      if (cancelled || res.type !== 'casefile') return;
      setFile(res.view);
      if (!res.view.setup) {
        // Newest memo opens by default the first time it exists.
        setOpenId((prev) => {
          const id = prev ?? res.view.messages[res.view.messages.length - 1]?.id ?? null;
          if (id) markSeen(id);
          return id;
        });
      }
    });
    return () => {
      cancelled = true;
    };
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
  type Section = 'messages' | 'notes' | 'evidence' | 'summary';
  const [section, setSection] = useState<Section>('messages');

  // --- The player's own documents (notes + evidence copies) ---
  const [docs, setDocs] = useState<import('@gamecore/types.ts').ItemSummary[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [docText, setDocText] = useState('');
  const [docName, setDocName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef(0);
  const dirtyRef = useRef(false);

  const isCopy = (name: string) => name.startsWith('Copy of ');

  const fetchDocs = async () => {
    const res = await send({ type: 'listChildren', parentId: 'casefile' });
    if (res.type === 'children') {
      setDocs(res.items.filter((i) => i.editable && i.kind === 'document'));
    }
  };
  useEffect(() => {
    void fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEpoch]);

  const flushSave = async () => {
    window.clearTimeout(saveTimer.current);
    if (!dirtyRef.current || !docId) return;
    dirtyRef.current = false;
    await send({ type: 'saveDocument', docId, name: docName, text: docText });
    setNotice('Saved.');
  };

  const scheduleSave = (id: string, name: string, text: string) => {
    dirtyRef.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      dirtyRef.current = false;
      void send({ type: 'saveDocument', docId: id, name, text }).then(() => setNotice('Saved.'));
    }, 900);
  };

  const openDoc = async (id: string) => {
    await flushSave();
    const res = await send({ type: 'open', itemId: id });
    if (res.type === 'open' && res.ok && res.item) {
      setDocId(res.item.id);
      setDocName(res.item.name);
      setDocText(res.item.body?.text ?? '');
    }
  };

  const createNote = async () => {
    setMenuOpen(null);
    await flushSave();
    const taken = new Set(docs.map((d) => d.name));
    let name = 'New Note.txt';
    for (let n = 2; taken.has(name) && n < 99; n++) name = `New Note (${n}).txt`;
    const res = await send({ type: 'saveDocument', name, text: '', folderId: 'casefile' });
    if (res.type === 'document' && res.ok && res.item) {
      setSection('notes');
      setDocId(res.item.id);
      setDocName(res.item.name);
      setDocText('');
      await fetchDocs();
    } else {
      setNotice('The note could not be created.');
    }
  };

  const commitRename = async (name: string) => {
    if (!docId || !name.trim()) return;
    const res = await send({ type: 'renameItem', itemId: docId, name: name.trim() });
    if (res.type === 'document' && res.ok && res.item) {
      setDocName(res.item.name);
      await fetchDocs();
    }
  };

  const deleteDoc = async () => {
    setConfirmDelete(false);
    if (!docId) return;
    window.clearTimeout(saveTimer.current);
    dirtyRef.current = false;
    await send({ type: 'deleteDocument', docId });
    setDocId(null);
    setDocName('');
    setDocText('');
    await fetchDocs();
    setNotice('Deleted.');
  };

  const editClipboard = (op: 'cut' | 'copy' | 'paste') => {
    setMenuOpen(null);
    const el = document.activeElement;
    if (!(el instanceof HTMLTextAreaElement)) return;
    if (op === 'paste') {
      void navigator.clipboard.readText().then((clip) => {
        const at = el.selectionStart;
        const next = docText.slice(0, at) + clip + docText.slice(el.selectionEnd);
        setDocText(next);
        if (docId) scheduleSave(docId, docName, next);
      });
      return;
    }
    document.execCommand(op);
    if (op === 'cut' && docId) {
      // execCommand mutated the textarea; sync state on next tick.
      window.setTimeout(() => {
        setDocText(el.value);
        scheduleSave(docId, docName, el.value);
      }, 0);
    }
  };

  const [guideOpen, setGuideOpen] = useState(false);

  const refetch = async () => {
    const res = await send({ type: 'getCaseFile' });
    if (res.type === 'casefile') setFile(res.view);
  };

  /** The ribbon's Check Server: real wire sweep, then a fresh case file. */
  const checkServer = async () => {
    setMenuOpen(null);
    const res = await send({ type: 'checkMail' });
    if (res.type === 'net' && !res.online) {
      setOfflineWarn(true);
      return;
    }
    await refetch();
    setNotice('Case server checked.');
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
  useEffect(() => {
    if (!file) return;
    const st = useWindowStore.getState();
    st.setResizable(windowId, !wizardActive);
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_HEIGHT;
    const [w, h] = wizardActive ? [700, 530] : [880, 640];
    st.setRect(windowId, {
      x: Math.max(8, Math.round((vw - w) / 2)),
      y: Math.max(8, Math.round((vh - h) / 2)),
      w: Math.min(w, vw - 16),
      h: Math.min(h, vh - 16),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- file presence only gates first run
  }, [windowId, wizardActive, file === null]);

  const finishWizard = () => {
    // Land in the inbox with the newest message open (the briefing).
    const id = file?.messages[file.messages.length - 1]?.id ?? null;
    setOpenId(id);
    if (id) markSeen(id);
    setSyncStage('idle');
  };

  // ----------------------------------------------------------------------

  if (!file) {
    return (
      <Frame variant="well" style={{ flex: 1, padding: 12, fontSize: 13 }}>
        Opening Case Files ...
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
  const sectionDocs = docs.filter((d) => (section === 'evidence') === isCopy(d.name));
  const online = gameView?.online === true;

  const switchSection = (to: 'messages' | 'notes' | 'evidence' | 'summary') => {
    setMenuOpen(null);
    void flushSave();
    setSection(to);
  };

  const docsPane = (
    <Layout>
      <MemoList>
        {sectionDocs.map((d) => (
          <MemoRow
            key={d.id}
            $active={d.id === docId}
            $unread={false}
            onClick={() => void openDoc(d.id)}
          >
            <span>{d.name}</span>
            <small>{d.meta?.modifiedAt ?? ''}</small>
          </MemoRow>
        ))}
        {sectionDocs.length === 0 && (
          <div style={{ padding: 8, color: '#777', fontSize: 13 }}>
            {section === 'notes'
              ? '(no notes yet — use New Note)'
              : '(nothing saved yet — right-click any file on the computer and choose Save to Case Files)'}
          </div>
        )}
      </MemoList>
      {docId && sectionDocs.some((d) => d.id === docId) ? (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <TextInput
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              onBlur={() => void commitRename(docName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename(docName);
              }}
              style={{ flex: 1 }}
            />
            <Button onClick={() => setConfirmDelete(true)} style={{ width: 70 }}>
              Delete
            </Button>
          </div>
          <NotePaper
            value={docText}
            spellCheck={false}
            onChange={(e) => {
              setDocText(e.target.value);
              if (docId) scheduleSave(docId, docName, e.target.value);
            }}
          />
        </div>
      ) : (
        <Reading>
          <span style={{ color: '#777' }}>
            {section === 'notes' ? 'Select a note, or use New Note.' : 'Select a copy.'}
          </span>
        </Reading>
      )}
    </Layout>
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
            <MenuListItem size="sm" onClick={() => void createNote()}>
              New Note
            </MenuListItem>
            <MenuListItem
              size="sm"
              disabled={!docId}
              onClick={docId ? () => { setMenuOpen(null); void flushSave(); } : undefined}
            >
              Save
            </MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                void flushSave();
                useWindowStore.getState().close(windowId);
              }}
            >
              Close
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'edit' && (
          <Drop $left={38}>
            <MenuListItem size="sm" disabled={section === 'messages' || section === 'summary' || !docId} onClick={() => editClipboard('cut')}>
              Cut
            </MenuListItem>
            <MenuListItem
              size="sm"
              disabled={section === 'summary'}
              onClick={section === 'messages' ? copyText : () => editClipboard('copy')}
            >
              Copy
            </MenuListItem>
            <MenuListItem size="sm" disabled={section === 'messages' || section === 'summary' || !docId} onClick={() => editClipboard('paste')}>
              Paste
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'view' && (
          <Drop $left={78}>
            <MenuListItem size="sm" onClick={() => switchSection('messages')}>Messages</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('notes')}>Notes</MenuListItem>
            <MenuListItem size="sm" onClick={() => switchSection('evidence')}>Evidence Copies</MenuListItem>
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

      <Ribbon>
        <RibbonButton onClick={() => void checkServer()}>
          <Icon name="mail-app" size={22} />
          Check Server
        </RibbonButton>
        <RibbonSep />
        <RibbonButton onClick={() => void createNote()}>
          <Icon name="notepad" size={22} />
          New Note
        </RibbonButton>
        <RibbonButton disabled>
          <Icon name="printer" size={22} />
          Print
        </RibbonButton>
      </Ribbon>

      <TitleBand>{file.title || '...'}</TitleBand>

      <NavRow>
        {(
          [
            ['messages', 'Messages'],
            ['notes', 'Notes'],
            ['evidence', 'Evidence Copies'],
            ['summary', 'Case Summary'],
          ] as const
        ).map(([id, label]) => (
          <NavTab key={id} $active={section === id} onClick={() => switchSection(id)}>
            {label}
          </NavTab>
        ))}
      </NavRow>

      {section === 'messages' && (
        <Layout>
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

      {(section === 'notes' || section === 'evidence') && docsPane}

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
                  Delete "{docName}"? This file is yours — the deletion is permanent.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <Button onClick={() => void deleteDoc()} style={{ width: 80 }}>
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
