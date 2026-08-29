import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Frame, GroupBox, ProgressBar } from 'react95';
import { PIXEL_MONO } from '../theme';

const Wrap = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #444;
  margin-top: 4px;
`;

export function SystemMonitor() {
  // A gently jittering gauge, stepped like the real perf meters.
  const [cpu, setCpu] = useState(23);
  useEffect(() => {
    const t = window.setInterval(() => {
      setCpu((c) => Math.max(4, Math.min(92, c + Math.round((Math.random() - 0.48) * 14))));
    }, 900);
    return () => window.clearInterval(t);
  }, []);

  return (
    <Wrap>
      <GroupBox label="Processor (MicroCore 166)">
        <ProgressBar value={cpu} />
        <Row>
          <span>Kernel usage: {cpu}%</span>
          <span>1 processor, trying its best</span>
        </Row>
      </GroupBox>
      <GroupBox label="Memory">
        <ProgressBar value={87} />
        <Row>
          <span>27.8 MB of 32 MB in use</span>
          <span>swapping enthusiastically</span>
        </Row>
      </GroupBox>
      <GroupBox label="Casey (C:)">
        <ProgressBar value={71} />
        <Row>
          <span>862 MB used / 1.2 GB</span>
          <span>341 MB free</span>
        </Row>
      </GroupBox>
      <Frame
        variant="well"
        style={{ padding: '4px 8px', fontFamily: PIXEL_MONO, fontSize: 16, flexShrink: 0 }}
      >
        Up time: 8 days, 21:47:00
      </Frame>
      <div style={{ fontSize: 12, color: '#555' }}>
        Nobody has shut this computer down since October 10.
      </div>
    </Wrap>
  );
}
