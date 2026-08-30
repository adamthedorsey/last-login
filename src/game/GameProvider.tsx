import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActionResult, DiscoveryView, GameAction, StateView, WireNotice } from '@gamecore/types.ts';
import { createGameClient, type GameClient } from './client';
import { GameContext, type GameContextValue, type Toast } from './gameContext';
import { playBuddyOff, playBuddyOn, playImMsg, playMailSound, playNotify } from '../os/sounds';
import { useWindowStore } from '../os/windowStore';

/** Generic per-kind toast copy — deliberately spoiler-free client strings.
 * Anything specific (names, subjects) must arrive IN the notice, server-sent. */
const WIRE_FALLBACK: Partial<
  Record<WireNotice['kind'], { title: string; text: string; icon: string }>
> = {
  mail: { title: 'Mail', text: 'You have new mail.', icon: 'mail-app' },
  im: { title: 'Chat', text: 'New instant message.', icon: 'im-app' },
  'buddy-on': { title: 'Chat', text: 'Someone just signed on.', icon: 'im-app' },
  'buddy-off': { title: 'Chat', text: 'Someone just signed off.', icon: 'im-app' },
  system: { title: 'System', text: '', icon: 'warning' },
};

/** How often the client asks "anything on the wire?" while connected. Pure
 * polling theater — all timing/content decisions live in the engine. */
const HEARTBEAT_MS = 10000;

let toastId = 0;
/** In-flight engine calls — the wait cursor clears when the last one lands. */
let pendingSends = 0;

export function GameProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<GameClient | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<StateView | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [contentEpoch, setContentEpoch] = useState(0);
  const [netActivity, setNetActivity] = useState(0);
  const [lineDropSignal, setLineDropSignal] = useState(0);
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
    if (res.linePickup) setLineDropSignal((n) => n + 1);
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
      if (res.linePickup) setLineDropSignal((n) => n + 1);
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
          ...discoveries.map((d) => ({
            id: ++toastId,
            title: d.title,
            description: d.description,
            icon: 'notes',
          })),
        ]);
        setContentEpoch((e) => e + 1);
        void refreshView();
      }
      if (ended) {
        // The season doesn't end with a dialog. It ends with a sign-on —
        // authored as a scheduled event (the engine fires it on the next
        // wire sweep while online; offline, he waits for the next
        // connection). If the player never takes the bait, the season
        // card still arrives.
        window.setTimeout(() => {
          if (!endCardSeenRef.current) setShowEndCard(true);
        }, 120000);
      }
    },
    [refreshView],
  );

  /** Ambient wire notices: chirp, toast, and refetch. The client only ever
   * renders what the server sent — it has no idea what any event MEANS. */
  const handleWire = useCallback(
    (notices: WireNotice[]) => {
      for (const n of notices) {
        switch (n.kind) {
          case 'mail':
            playMailSound();
            break;
          case 'im':
            playImMsg();
            break;
          case 'buddy-on':
            playBuddyOn();
            break;
          case 'buddy-off':
            playBuddyOff();
            break;
          case 'roster':
          case 'remote':
            break; // silent — the refetch below tells the shell/roster
          default:
            playNotify();
        }
        const fb = WIRE_FALLBACK[n.kind];
        if (fb) {
          setToasts((prev) => [
            ...prev,
            { id: ++toastId, title: n.title ?? fb.title, description: n.text ?? fb.text, icon: fb.icon },
          ]);
        }
        if (n.kind === 'im' && n.screenname) {
          // Somebody messaged first — their window opens, like it did in 1997.
          useWindowStore.getState().open('buddyline', {
            props: { liveScreenname: n.screenname, wireSeq: Date.now() },
          });
        }
      }
      if (notices.length > 0) {
        setContentEpoch((e) => e + 1);
        void refreshView();
      }
    },
    [refreshView],
  );

  const send = useCallback(
    async (action: GameAction): Promise<ActionResult> => {
      const client = clientRef.current;
      if (!client) return { type: 'error', error: 'not_ready' };
      // The hourglass: a slow call (the real server, not the dev adapter)
      // flips EVERY cursor to the pixel hourglass after a beat, exactly
      // like 1997 did (the .busy rule lives in the global styles).
      pendingSends += 1;
      const hourglass = window.setTimeout(() => {
        document.documentElement.classList.add('busy');
      }, 150);
      let res: ActionResult;
      try {
        res = await client.send(action);
      } finally {
        pendingSends -= 1;
        window.clearTimeout(hourglass);
        if (pendingSends === 0) document.documentElement.classList.remove('busy');
      }
      if (viewRef.current?.online) setNetActivity((n) => n + 1);
      if (res.linePickup) {
        // The house picked up the phone. Refresh so every app sees the line
        // is down; the shell shows the scare off this signal.
        setLineDropSignal((n) => n + 1);
        setContentEpoch((e) => e + 1);
        void refreshView();
      }
      if (res.wire) handleWire(res.wire);
      if (
        res.type === 'open' ||
        res.type === 'visit' ||
        res.type === 'chat' ||
        res.type === 'remote' ||
        res.type === 'document'
      ) {
        noteDiscoveries(res.newDiscoveries, res.ended);
      }
      if (res.type === 'net') {
        // Refetch only when something actually changed — the heartbeat polls
        // this result shape every few seconds and must not thrash the apps.
        const wasOnline = viewRef.current?.online === true;
        const newMail = res.newMail ?? 0;
        if (res.online !== wasOnline || newMail > 0) {
          setContentEpoch((e) => e + 1);
          void refreshView();
        }
        // Mail that arrived silently (no authored notice) still gets the
        // generic chime — arrival IS the ambient event.
        if (newMail > 0 && !res.wire?.some((w) => w.kind === 'mail')) {
          playMailSound();
          setToasts((prev) => [
            ...prev,
            { id: ++toastId, title: 'Mail', description: 'You have new mail.', icon: 'mail-app' },
          ]);
        }
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
    [noteDiscoveries, refreshView, handleWire],
  );

  // The heartbeat: while the line is up, ask the engine every few seconds
  // whether anything happened on the wire (scheduled events, mail delivery).
  // Offline, the machine is a sealed box and nothing ticks.
  const online = view?.online === true;
  useEffect(() => {
    if (!online) return;
    const t = window.setInterval(() => {
      void send({ type: 'checkMail' });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(t);
  }, [online, send]);

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
      netActivity,
      lineDropSignal,
      showEndCard,
      setShowEndCard,
      client: clientRef.current,
    }),
    [ready, view, send, refreshView, toasts, dismissToast, contentEpoch, netActivity, lineDropSignal, showEndCard],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
