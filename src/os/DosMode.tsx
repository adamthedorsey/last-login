/**
 * "Restart in MT-DOS mode" — a real, typeable DOS prompt.
 *
 * Everything it shows comes from the ENGINE (listChildren/open), so all
 * content gating carries over automatically: files the player hasn't earned
 * simply do not exist here, and password-locked items refuse with
 * "Access denied." No story text lives in this file.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { ItemSummary } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { dosShortName as shortName } from './dosname';
import { playDosBoot, stopMachineSounds } from './sounds';
import { PIXEL_MONO } from '../theme';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  color: #b8b8b8;
  font-family: ${PIXEL_MONO};
  font-size: 16px;
  line-height: 1.2;
  padding: 8px 10px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  z-index: 100006;
  cursor: var(--cursor-text);
`;

const Cursor = styled.span`
  animation: dos-blink 0.9s steps(1) infinite;
  @keyframes dos-blink {
    50% {
      opacity: 0;
    }
  }
`;

interface DirLevel {
  id: string;
  /** Uppercased path segment ("MY DOCUMENTS"). */
  seg: string;
}

const MAX_LINES = 600;
const BROWSABLE = new Set(['document', 'email', 'trash_item', 'im_conversation']);

/** Format straight from the ISO string — Date() would shift date-only
 * values by the player's timezone, and these stamps are evidence. */
function fmtDate(iso?: string): string {
  if (!iso || iso.length < 10) return '        ';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${m}-${d}-${y.slice(2)}`;
}

function entryDate(i: ItemSummary): string | undefined {
  return i.meta?.modifiedAt ?? i.meta?.createdAt ?? i.meta?.deletedAt ?? i.meta?.date;
}

export function DosMode({ onExit }: { onExit: () => void }) {
  const { send, view } = useGame();
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Path lives in a ref (async command handlers need the live value) with a
  // version counter so the prompt re-renders the moment a silent `cd` lands.
  const [pathVer, setPathVer] = useState(0);
  const pathRef = useRef<DirLevel[]>([{ id: 'folder.c', seg: 'C:' }]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const volLabel = view?.dosVolume?.label ?? 'NO NAME';
  const volSerial = view?.dosVolume?.serial ?? '0000-0000';

  // Dropping to DOS reboots the machine: the BIOS beep, the boot chatter,
  // then the fan holds a quiet loop with the disk reading over it —
  // silenced again on the way back to Horizons.
  useEffect(() => {
    playDosBoot();
    return () => stopMachineSounds();
  }, []);

  const prompt = useMemo(() => {
    const p = pathRef.current;
    return p.length === 1 ? 'C:\\>' : `C:\\${p.slice(1).map((l) => l.seg).join('\\')}>`;
  }, [pathVer]); // eslint-disable-line react-hooks/exhaustive-deps -- pathVer tracks pathRef

  const print = useCallback((out: string[]) => {
    setLines((prev) => [...prev, ...out].slice(-MAX_LINES));
  }, []);

  const bannerPrinted = useRef(false);
  useEffect(() => {
    if (bannerPrinted.current) return; // StrictMode double-mounts effects
    bannerPrinted.current = true;
    print([
      'Microtech Horizons 95 is restarting in MT-DOS mode.',
      '',
      'MT-DOS Version 7.10',
      '(C)Copyright Microtech Systems 1988-1995.',
      '',
    ]);
  }, [print]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines, input]);

  const children = useCallback(async (): Promise<ItemSummary[]> => {
    const cur = pathRef.current[pathRef.current.length - 1];
    const res = await send({ type: 'listChildren', parentId: cur.id });
    return res.type === 'children' ? res.items : [];
  }, [send]);

  const findEntry = (items: ItemSummary[], raw: string): ItemSummary | undefined => {
    const q = raw.trim().toLowerCase();
    return items.find(
      (i) =>
        i.name.toLowerCase() === q ||
        shortName(i.name, i.kind === 'folder').toLowerCase() === q,
    );
  };

  const doDir = async () => {
    const items = await children();
    const p = pathRef.current;
    const here = p.length === 1 ? 'C:\\' : `C:\\${p.slice(1).map((l) => l.seg).join('\\')}`;
    const out: string[] = [
      ` Volume in drive C is ${volLabel}`,
      ` Volume Serial Number is ${volSerial}`,
      ` Directory of ${here}`,
      '',
    ];
    const dirs = items.filter((i) => i.kind === 'folder');
    const files = items.filter((i) => i.kind !== 'folder');
    let bytes = 0;
    for (const d of dirs) {
      out.push(`${shortName(d.name, true).padEnd(12)} <DIR>          ${fmtDate(entryDate(d))}  ${d.name}`);
    }
    for (const f of files) {
      const size = Math.max(1, f.meta?.sizeKb ?? 1) * 1024;
      bytes += size;
      out.push(
        `${shortName(f.name, false).padEnd(12)} ${String(size.toLocaleString('en-US')).padStart(9)}  ${fmtDate(entryDate(f))}  ${f.name}`,
      );
    }
    out.push(`        ${dirs.length} dir(s)  ${files.length} file(s)  ${bytes.toLocaleString('en-US')} bytes`, '');
    print(out);
  };

  const doCd = async (arg: string) => {
    const target = arg.trim();
    if (!target || target === '.') return;
    if (target === '\\' || target === '/') {
      pathRef.current = pathRef.current.slice(0, 1);
      setPathVer((v) => v + 1);
      return;
    }
    if (target === '..') {
      if (pathRef.current.length > 1) pathRef.current = pathRef.current.slice(0, -1);
      setPathVer((v) => v + 1);
      return;
    }
    const items = await children();
    const hit = findEntry(items, target);
    if (hit && hit.kind === 'folder') {
      pathRef.current = [...pathRef.current, { id: hit.id, seg: hit.name.toUpperCase() }];
      setPathVer((v) => v + 1);
    } else {
      print(['Invalid directory', '']);
    }
  };

  const doType = async (arg: string) => {
    if (!arg.trim()) {
      print(['Required parameter missing', '']);
      return;
    }
    const items = await children();
    const hit = findEntry(items, arg);
    if (!hit) {
      print(['File not found', '']);
      return;
    }
    if (hit.kind === 'folder') {
      print(['Access denied', '']);
      return;
    }
    if (!BROWSABLE.has(hit.kind)) {
      print(['TYPE: cannot display binary data', '']);
      return;
    }
    const res = await send({ type: 'open', itemId: hit.id });
    if (res.type !== 'open' || !res.ok || !res.item) {
      print(['Access denied', '']);
      return;
    }
    const text = res.item.body?.text;
    if (text) {
      print([...text.split('\n'), '']);
    } else if (res.item.body?.messages) {
      print([...res.item.body.messages.map((m) => `<${m.from}> ${m.text}`), '']);
    } else {
      print(['TYPE: cannot display binary data', '']);
    }
  };

  const doExit = () => {
    setLeaving(true);
    print(['', 'Starting Microtech Horizons 95 ...']);
    window.setTimeout(onExit, 1400);
  };

  const execute = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // DOS accepted "cd.." and "cd\" without a space.
    const compact = trimmed.toLowerCase();
    const [cmdRaw, ...rest] = trimmed.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const arg = rest.join(' ');

    if (compact === 'cd..') return doCd('..');
    if (compact === 'cd\\' || compact === 'cd/') return doCd('\\');

    switch (cmd) {
      case 'dir':
        return doDir();
      case 'cd':
      case 'chdir':
        return doCd(arg);
      case 'type':
        return doType(arg);
      case 'cls':
        setLines([]);
        return;
      case 'echo':
        print([arg || 'ECHO is on', '']);
        return;
      case 'ver':
        print(['', 'MT-DOS Version 7.10', '']);
        return;
      case 'vol':
        print([` Volume in drive C is ${volLabel}`, ` Volume Serial Number is ${volSerial}`, '']);
        return;
      case 'mem':
        print([
          '',
          'Memory Type        Total       Used       Free',
          '----------------  --------   --------   --------',
          'Conventional          640K       121K       519K',
          'Upper                 155K       155K         0K',
          'Reserved              384K       384K         0K',
          'Extended (XMS)     31,573K     2,112K    29,461K',
          '----------------  --------   --------   --------',
          'Total memory       32,752K     2,772K    29,980K',
          '',
          'Largest executable program size       518K (530,432 bytes)',
          '',
        ]);
        return;
      case 'scandisk':
        print([
          '',
          `Microtech ScanDisk checking drive C (${volLabel}) ...`,
          '',
          '  Media descriptor ............... OK',
          '  File allocation tables ......... OK',
          '  Directory structure ............ OK',
          '  File system .................... OK',
          '',
          'ScanDisk found no errors on this drive.',
          '1 recovered file fragment is saved in the root directory.',
          '',
        ]);
        return;
      case 'help':
        print(['DIR    CD    TYPE    CLS    VOL    VER    MEM    SCANDISK    ECHO    EXIT', '']);
        return;
      case 'win':
      case 'exit':
        doExit();
        return;
      default:
        print(['Bad command or file name', '']);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (leaving || busy) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        const raw = input;
        setInput('');
        setLines((prev) => [...prev, `${prompt}${raw}`].slice(-MAX_LINES));
        setBusy(true);
        void execute(raw).finally(() => setBusy(false));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setInput((v) => v.slice(0, -1));
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        setInput((v) => (v.length < 80 ? v + e.key : v));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- execute reads live refs
  }, [input, prompt, busy, leaving]);

  return (
    <Screen>
      {lines.join('\n')}
      {lines.length > 0 ? '\n' : ''}
      {!leaving && !busy && (
        <>
          {prompt}
          {input}
          <Cursor>█</Cursor>
        </>
      )}
      <div ref={bottomRef} />
    </Screen>
  );
}
