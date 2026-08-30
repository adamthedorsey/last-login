/**
 * Find: Files or Folders — the Win95 file search, backed by the engine's
 * findFiles action. Everything shown is server-gated: files the player
 * hasn't earned simply do not exist to this dialog.
 */
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Frame, Hourglass, ScrollView, TextInput } from 'react95';
import type { FindHit } from '@gamecore/types.ts';
import { useGame } from '../game/gameContext';
import { launchItem } from '../os/launch';
import { Icon } from '../os/icons';
import { TYPE_NAMES } from '../os/fileTypes';

const Field = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
`;

const HeadRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1.3fr 0.9fr;
  gap: 6px;
  padding: 3px 6px;
  background: #d4d0c8;
  border-bottom: 1px solid #888;
  font-weight: bold;
  font-size: 12px;
`;

const HitRow = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 1.2fr 1.3fr 0.9fr;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  text-align: left;
  padding: 2px 6px;
  font-size: 13px;
  background: ${(p) => (p.$selected ? '#000080' : 'transparent')};
  color: ${(p) => (p.$selected ? '#fff' : 'inherit')};
  cursor: var(--cursor-arrow);
  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export function FindFiles() {
  const { send } = useGame();
  const [named, setNamed] = useState('');
  const [containing, setContaining] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<FindHit[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const runSeq = useRef(0);

  const findNow = () => {
    if (searching || (!named.trim() && !containing.trim())) return;
    const seq = ++runSeq.current;
    setSearching(true);
    setHits(null);
    setSelected(null);
    void send({ type: 'findFiles', query: named, text: containing.trim() || undefined }).then(
      (res) => {
        // A 1997 disk takes a moment to rummage through.
        window.setTimeout(() => {
          if (runSeq.current !== seq) return;
          setSearching(false);
          setHits(res.type === 'find' ? res.items : []);
        }, 900);
      },
    );
  };

  const stop = () => {
    runSeq.current += 1;
    setSearching(false);
  };

  const newSearch = () => {
    stop();
    setNamed('');
    setContaining('');
    setHits(null);
    setSelected(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') findNow();
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <Field>
            <span>Named:</span>
            <TextInput value={named} onChange={(e) => setNamed(e.target.value)} onKeyDown={onKeyDown} />
          </Field>
          <Field>
            <span>Containing text:</span>
            <TextInput
              value={containing}
              onChange={(e) => setContaining(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </Field>
          <Field>
            <span>Look in:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="drive" size={18} />
              Casey (C:)
            </span>
          </Field>
          <Checkbox label="Include subfolders" checked disabled style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 110 }}>
          <Button onClick={findNow} disabled={searching}>
            Find Now
          </Button>
          <Button onClick={stop} disabled={!searching}>
            Stop
          </Button>
          <Button onClick={newSearch} disabled={searching}>
            New Search
          </Button>
          {searching && (
            <div style={{ alignSelf: 'center', marginTop: 8 }}>
              <Hourglass size={28} />
            </div>
          )}
        </div>
      </div>
      <ScrollView style={{ flex: 1, minHeight: 0, marginTop: 6, background: '#fff' }}>
        <HeadRow>
          <span>Name</span>
          <span>In Folder</span>
          <span>Type</span>
        </HeadRow>
        {(hits ?? []).map((h) => (
          <HitRow
            key={h.id}
            $selected={selected === h.id}
            onClick={() => setSelected(h.id)}
            onDoubleClick={() => launchItem(h)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name={h.icon ?? 'doc'} size={16} />
              {h.name}
            </span>
            <span>{h.path}</span>
            <span>{TYPE_NAMES[h.kind] ?? h.kind}</span>
          </HitRow>
        ))}
      </ScrollView>
      <Frame variant="well" style={{ marginTop: 4, padding: '2px 8px', fontSize: 12, flexShrink: 0 }}>
        {searching ? 'Searching...' : hits === null ? 'Ready.' : `${hits.length} file(s) found`}
      </Frame>
    </>
  );
}
