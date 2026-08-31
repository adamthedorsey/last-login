/**
 * Sound Recorder — the Win95 accessory, faithful to the little
 * green-scope original. Two jobs:
 *
 *  - PLAY Casey's sound files (kind 'audio' evidence, engine-gated;
 *    recordings are authorized assets, and if one is missing the status
 *    line says so plainly).
 *  - RECORD the player's own audio notes for Case Files (microphone via
 *    MediaRecorder; the note is saved server-side, size-capped).
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Frame, MenuList, MenuListItem, Separator } from 'react95';
import { useGame } from '../game/gameContext';
import { useWindowStore } from '../os/windowStore';
import type { AppWindowProps } from '../os/appRegistry';

const Wells = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 2px;
`;

const SideWell = styled(Frame).attrs({ variant: 'well' })`
  width: 86px;
  padding: 3px 6px;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
`;

const Scope = styled(Frame).attrs({ variant: 'well' })`
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 2px;
`;

/** The seek slider: a plain Win95 track + thumb, no react95 Slider
 * (it crashes under React 19). Click or drag to seek. */
/** The rail sits inside a taller strip so the thumb never clips. */
const TrackStrip = styled.div`
  padding: 12px 4px 10px;
  flex-shrink: 0;
`;

const Track = styled.div`
  position: relative;
  height: 6px;
  border-top: 2px solid #808080;
  border-bottom: 2px solid #fff;
  background: #c8c4bc;
`;

const Thumb = styled.div`
  position: absolute;
  top: -8px;
  width: 11px;
  height: 21px;
  background: #d4d0c8;
  border: 2px solid;
  border-color: #fff #404040 #404040 #fff;
`;

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
  min-width: 150px;
  font-size: 13px;
`;

const RecDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #c00000;
`;

const fmt = (s: number) => `${s.toFixed(2)} sec.`;

type Mode = 'idle' | 'playing' | 'recording';

export function SoundRecorder({ windowId, props }: AppWindowProps) {
  const { send } = useGame();
  const close = useWindowStore((s) => s.close);
  const itemId = props.itemId as string | undefined;
  const armRecord = props.record === true;

  const [name, setName] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  const [pos, setPos] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  const [status, setStatus] = useState('');
  const [menuOpen, setMenuOpen] = useState<'file' | 'edit' | 'effects' | 'help' | null>(null);
  const [scopeBars, setScopeBars] = useState<number[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const setTitle = useWindowStore((s) => s.setTitle);

  // Evidence playback: the engine serves the file (gating included).
  useEffect(() => {
    if (!itemId) return;
    let canceled = false;
    void send({ type: 'open', itemId }).then((res) => {
      if (canceled) return;
      if (res.type === 'open' && res.ok && res.item) {
        setName(res.item.name);
        setSrc(res.item.meta?.audioSrc ?? null);
        setLength(res.item.meta?.audioSeconds ?? 0);
        setTitle(windowId, `${res.item.name} - Sound Recorder`);
      } else {
        setStatus('Sound Recorder cannot open this file.');
      }
    });
    return () => {
      canceled = true;
    };
  }, [itemId, send, setTitle, windowId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  // The green scope: flat line at rest, stepped bars while sound moves.
  useEffect(() => {
    if (mode === 'idle') return;
    const t = window.setInterval(() => {
      setScopeBars(Array.from({ length: 46 }, () => Math.floor(Math.random() * 22) + 2));
    }, 120);
    return () => window.clearInterval(t);
  }, [mode]);

  // Position ticker.
  useEffect(() => {
    if (mode === 'idle') return;
    const t = window.setInterval(() => {
      if (mode === 'playing' && audioRef.current) setPos(audioRef.current.currentTime);
      else if (mode === 'recording') setPos((p) => p + 0.1);
    }, 100);
    return () => window.clearInterval(t);
  }, [mode]);

  const stopAll = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    setMode('idle');
  };

  const play = () => {
    if (!src) {
      setStatus('Cannot play this file.');
      return;
    }
    stopAll();
    try {
      const a = new Audio(src);
      a.currentTime = pos < length ? pos : 0;
      a.onended = () => {
        setMode('idle');
        setPos(0);
      };
      a.onerror = () => {
        setMode('idle');
        setStatus('Cannot play this file.');
      };
      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration) && a.duration > 0) setLength(a.duration);
      };
      audioRef.current = a;
      void a.play().then(
        () => {
          setStatus('');
          setMode('playing');
        },
        () => setStatus('Cannot play this file.'),
      );
    } catch {
      setStatus('Cannot play this file.');
    }
  };

  const record = async () => {
    stopAll();
    setPos(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? '');
          const fixed = dataUrl.startsWith('data:audio/')
            ? dataUrl
            : dataUrl.replace(/^data:[^;]*/, 'data:audio/webm');
          void send({ type: 'saveAudioNote', dataUrl: fixed }).then((res) => {
            setStatus(
              res.type === 'casefile'
                ? 'Saved to Case Files.'
                : res.type === 'document' && res.error === 'too_many'
                  ? 'Case Files is full — delete an audio note first.'
                  : 'The recording could not be saved.',
            );
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRef.current = rec;
      rec.start();
      setStatus('Recording...');
      setMode('recording');
    } catch {
      setStatus('No recording device is available.');
    }
  };

  const stop = () => {
    const wasRecording = mode === 'recording';
    stopAll();
    if (!wasRecording) setStatus('');
  };

  const seek = (clientX: number) => {
    if (!trackRef.current || !length) return;
    const r = trackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setPos(frac * length);
    if (audioRef.current) audioRef.current.currentTime = frac * length;
  };

  const frac = length > 0 ? Math.max(0, Math.min(1, pos / length)) : 0;
  const canRecord = !itemId; // evidence files are read-only

  return (
    <>
      <MenuRow ref={menuRef}>
        {(['file', 'edit', 'effects', 'help'] as const).map((m) => (
          <MenuButton
            key={m}
            $open={menuOpen === m}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen((v) => (v === m ? null : m))}
            onMouseEnter={() => setMenuOpen((v) => (v ? m : v))}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </MenuButton>
        ))}
        {menuOpen === 'file' && (
          <Drop $left={0}>
            <MenuListItem size="sm" disabled>Open...</MenuListItem>
            <MenuListItem size="sm" disabled>Save As...</MenuListItem>
            <Separator />
            <MenuListItem
              size="sm"
              onClick={() => {
                setMenuOpen(null);
                stopAll();
                close(windowId);
              }}
            >
              Exit
            </MenuListItem>
          </Drop>
        )}
        {menuOpen === 'edit' && (
          <Drop $left={38}>
            <MenuListItem size="sm" disabled>Copy</MenuListItem>
            <MenuListItem size="sm" disabled>Insert File...</MenuListItem>
          </Drop>
        )}
        {menuOpen === 'effects' && (
          <Drop $left={76}>
            <MenuListItem size="sm" disabled>Increase Volume (by 25%)</MenuListItem>
            <MenuListItem size="sm" disabled>Add Echo</MenuListItem>
            <MenuListItem size="sm" disabled>Reverse</MenuListItem>
          </Drop>
        )}
        {menuOpen === 'help' && (
          <Drop $left={128}>
            <MenuListItem size="sm" disabled>Help Topics</MenuListItem>
          </Drop>
        )}
      </MenuRow>

      <Wells>
        <SideWell>
          Position:
          <br />
          <b>{fmt(pos)}</b>
        </SideWell>
        <Scope>
          {mode === 'idle' ? (
            <div style={{ width: '100%', height: 2, background: '#00c000' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              {scopeBars.map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: '#00c000' }} />
              ))}
            </div>
          )}
        </Scope>
        <SideWell>
          Length:
          <br />
          <b>{fmt(length)}</b>
        </SideWell>
      </Wells>

      <TrackStrip>
        <Track ref={trackRef} onPointerDown={(e) => seek(e.clientX)}>
          <Thumb style={{ left: `calc(${(frac * 100).toFixed(2)}% - 5px)` }} />
        </Track>
      </TrackStrip>

      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        <Button
          disabled={!length}
          onClick={() => {
            setPos(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
          style={{ flex: 1 }}
        >
          ◀◀
        </Button>
        <Button
          disabled={!length}
          onClick={() => {
            setPos(length);
            if (audioRef.current) audioRef.current.currentTime = length;
          }}
          style={{ flex: 1 }}
        >
          ▶▶
        </Button>
        <Button disabled={mode === 'recording' || !src} onClick={play} style={{ flex: 1 }}>
          ▶
        </Button>
        <Button disabled={mode === 'idle'} onClick={stop} style={{ flex: 1 }}>
          ■
        </Button>
        <Button disabled={!canRecord || mode === 'recording'} onClick={() => void record()} style={{ flex: 1 }}>
          <RecDot />
        </Button>
      </div>

      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {status || (name ?? (armRecord || canRecord ? 'Ready to record.' : 'Ready.'))}
      </Frame>
    </>
  );
}
