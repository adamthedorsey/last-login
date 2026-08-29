import { useState } from 'react';
import styled from 'styled-components';
// NOTE: react95's Slider relies on findDOMNode (removed in React 19) — avoid it.
import { Button, GroupBox, Monitor, Select, Tab, TabBody, Tabs } from 'react95';
import { useSettingsStore, WALLPAPERS } from '../os/settingsStore';

const Center = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0 12px;
`;

const SaverPreview = styled.div`
  width: 100%;
  height: 100%;
  background: #0a000a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Comic Sans MS', cursive;
  font-size: 11px;
  color: #ff7ad9;
`;

export function Display() {
  const { wallpaper, saverMinutes, setWallpaper, setSaverMinutes, previewSaver } =
    useSettingsStore();
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs value={tab} onChange={(value) => setTab(value as number)} style={{ flexShrink: 0 }}>
        <Tab value={0}>Background</Tab>
        <Tab value={1}>Screen Saver</Tab>
      </Tabs>
      <TabBody style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 0 && (
          <>
            <Center>
              <Monitor backgroundStyles={{ background: wallpaper }} />
            </Center>
            <GroupBox label="Wallpaper">
              <Select
                value={wallpaper}
                options={WALLPAPERS.map((w) => ({ label: w.name, value: w.color }))}
                onChange={(opt) => setWallpaper(opt.value as string)}
                width="100%"
                menuMaxHeight={200}
              />
              <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
                Applies immediately. Casey had it on Horizons Teal.
              </div>
            </GroupBox>
          </>
        )}
        {tab === 1 && (
          <>
            <Center>
              <Monitor>
                <SaverPreview>✿ casey ✿</SaverPreview>
              </Monitor>
            </Center>
            <GroupBox label="Wait before starting">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={saverMinutes}
                  options={[1, 2, 3, 5, 10].map((m) => ({
                    label: `${m} minute${m === 1 ? '' : 's'}`,
                    value: m,
                  }))}
                  onChange={(opt) => setSaverMinutes(opt.value as number)}
                  width={140}
                />
                <Button onClick={previewSaver} style={{ marginLeft: 'auto' }}>
                  Preview
                </Button>
              </div>
            </GroupBox>
            <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
              Saver: "casey" — set up before Oct 10. It still runs.
            </div>
          </>
        )}
      </TabBody>
    </>
  );
}
