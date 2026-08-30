/**
 * The Win95 Alt+Tab switcher: a plain gray panel of icons, hold Alt and tap
 * Tab to cycle, release Alt to land. No animation — it appears and snaps.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Frame } from 'react95';
import { useWindowStore, type OSWindow } from './windowStore';
import { Icon } from './icons';

const Box = styled(Frame)`
  position: fixed;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  z-index: 100009;
  padding: 12px 14px 8px;
`;

const IconRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Slot = styled.div<{ $selected: boolean }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${(p) => (p.$selected ? '#000080' : 'transparent')};
`;

const TitleWell = styled(Frame).attrs({ variant: 'well' })`
  margin-top: 8px;
  padding: 2px 8px;
  font-size: 13px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface SwitchState {
  list: OSWindow[];
  index: number;
}

export function AltTabSwitcher() {
  const focus = useWindowStore((s) => s.focus);
  const [state, setState] = useState<SwitchState | null>(null);
  const stateRef = useRef<SwitchState | null>(null);
  const update = (v: SwitchState | null) => {
    stateRef.current = v;
    setState(v);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !e.altKey) return;
      e.preventDefault();
      const cur = stateRef.current;
      if (cur) {
        const dir = e.shiftKey ? -1 : 1;
        update({ ...cur, index: (cur.index + dir + cur.list.length) % cur.list.length });
        return;
      }
      const list = [...useWindowStore.getState().windows].sort((a, b) => b.z - a.z);
      if (list.length === 0) return;
      update({ list, index: list.length > 1 ? 1 : 0 });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Alt') return;
      const cur = stateRef.current;
      if (!cur) return;
      focus(cur.list[cur.index].id);
      update(null);
    };
    const onBlur = () => update(null);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [focus]);

  if (!state) return null;
  const current = state.list[state.index];
  return (
    <Box>
      <IconRow>
        {state.list.map((w, i) => (
          <Slot key={w.id} $selected={i === state.index}>
            <Icon name={w.icon} size={32} />
          </Slot>
        ))}
      </IconRow>
      <TitleWell>{current.title}</TitleWell>
    </Box>
  );
}
