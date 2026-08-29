import styled from 'styled-components';
import { Frame, ScrollView } from 'react95';
import { useGame } from '../game/gameContext';

const Note = styled(Frame).attrs({ variant: 'well' })`
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #fffef2;
`;

export function CaseNotes() {
  const { view } = useGame();
  const notes = view?.discoveries ?? [];

  return (
    <>
      <div style={{ fontSize: 13, paddingBottom: 6, color: '#444', flexShrink: 0 }}>
        Things you've pieced together while going through this machine.
      </div>
      <ScrollView style={{ flex: 1, background: '#fff' }}>
        <div style={{ padding: 8 }}>
          {notes.length === 0 && (
            <div style={{ color: '#777', padding: 8 }}>
              Nothing yet. It's somebody's computer, that's all — so far.
            </div>
          )}
          {notes.map((n) => (
            <Note key={n.id}>
              <b>{n.title}</b>
              <div style={{ marginTop: 4, fontSize: 13 }}>{n.description}</div>
            </Note>
          ))}
        </div>
      </ScrollView>
    </>
  );
}
