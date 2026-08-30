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
import { Button, Frame } from 'react95';
import type { CaseFileView } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import { isMuted } from '../os/sounds';
import { Icon } from '../os/icons';
import wizardArt from '../assets/images/humble-county-wizard.jpg';
import { DOC_TEXT } from '../theme';

const SEEN_KEY = 'lastlogin.casefile.seen';

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

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

/** The wizard's left art panel: the office's own banner. */
const ArtPanel = styled.div`
  border: 1px solid #000;
  background: #00807f url(${wizardArt}) center top / cover no-repeat;
  image-rendering: pixelated;
`;

const WizTitle = styled.div`
  font-family: 'Times New Roman', Times, serif;
  font-size: 26px;
  font-weight: bold;
  margin: 4px 0 12px;
`;

const WizText = styled.div`
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const SyncWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 12px;
  padding: 8px 10px;
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

export function CaseFile() {
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
  if ((file.setup && file.setup.length > 0) || syncStage === 'done') {
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
                  {'Case Files is ready.\n\n'}
                  {newCount > 0
                    ? `${newCount} new message${newCount === 1 ? '' : 's'} received.`
                    : 'No new messages.'}
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
                    {syncStage === 'offline' && (
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
                <WizText>{current?.lines.join('\n')}</WizText>
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

  return (
    <>
      <TitleBand>{file.title || '...'}</TitleBand>
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
        <Reading>
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
              {open.text}
            </>
          ) : (
            <span style={{ color: '#777' }}>Select a message.</span>
          )}
        </Reading>
      </Layout>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {`${file.messages.length} message(s) on file`}
      </Frame>
    </>
  );
}
