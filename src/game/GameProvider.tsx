import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActionResult, DiscoveryView, GameAction, StateView } from '@gamecore/types.ts';
import { createGameClient, type GameClient } from './client';
import { GameContext, type GameContextValue, type Toast } from './gameContext';
import { playBuddyOn, playNotify } from '../os/sounds';

let toastId = 0;

export function GameProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<GameClient | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<StateView | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [contentEpoch, setContentEpoch] = useState(0);
  const [showEndCard, setShowEndCard] = useState(false);
  const viewRef = useRef<StateView | null>(null);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const endCardSeenRef = useRef(false);
  useEffect(() => {
    if (showEndCard) endCardSeenRef.current = true;
  }, [showEndCard]);

  const refreshView = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const res = await client.send({ type: 'getState' });
    if (res.type === 'state') setView(res.view);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const client = await createGameClient();
      if (cancelled) return;
      clientRef.current = client;
      const res = await client.send({ type: 'getState' });
      if (cancelled) return;
      if (res.type === 'state') setView(res.view);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const noteDiscoveries = useCallback(
    (discoveries: DiscoveryView[] | undefined, ended: boolean | undefined) => {
      if (discoveries && discoveries.length > 0) {
        playNotify();
        setToasts((prev) => [
          ...prev,
          ...discoveries.map((d) => ({ id: ++toastId, title: d.title, description: d.description })),
        ]);
        setContentEpoch((e) => e + 1);
        void refreshView();
      }
      if (ended) {
        // The season doesn't end with a dialog. It ends with a sign-on —
        // which needs the line to be up. Offline, he simply waits for the
        // player's next connection.
        window.setTimeout(() => {
          if (!viewRef.current?.online) return;
          playBuddyOn();
          setToasts((prev) => [
            ...prev,
            { id: ++toastId, title: 'Chat', description: 'Someone just signed on.' },
          ]);
          setContentEpoch((e) => e + 1);
        }, 4500);
        // If the player never takes the bait, the season card still arrives.
        window.setTimeout(() => {
          if (!endCardSeenRef.current) setShowEndCard(true);
        }, 120000);
      }
    },
    [refreshView],
  );

  const send = useCallback(
    async (action: GameAction): Promise<ActionResult> => {
      const client = clientRef.current;
      if (!client) return { type: 'error', error: 'not_ready' };
      const res = await client.send(action);
      if (res.type === 'open' || res.type === 'visit' || res.type === 'chat') {
        noteDiscoveries(res.newDiscoveries, res.ended);
      }
      if (res.type === 'net') {
        // Connection state or mail delivery changed — every app refetches.
        setContentEpoch((e) => e + 1);
        void refreshView();
      }
      if (res.type === 'document' && res.ok) {
        // A player file was created/renamed — desktop views should refetch.
        setContentEpoch((e) => e + 1);
      }
      if (res.type === 'login' && res.ok && res.view) setView(res.view);
      if (res.type === 'reset') {
        setView(res.view);
        setContentEpoch((e) => e + 1);
        setShowEndCard(false);
      }
      return res;
    },
    [noteDiscoveries, refreshView],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      view,
      clientMode: clientRef.current?.mode ?? 'dev',
      send,
      refreshView,
      toasts,
      dismissToast,
      contentEpoch,
      showEndCard,
      setShowEndCard,
      client: clientRef.current,
    }),
    [ready, view, send, refreshView, toasts, dismissToast, contentEpoch, showEndCard],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
