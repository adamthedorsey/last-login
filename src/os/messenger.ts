/**
 * Messenger window plumbing. IM conversations open as their OWN windows,
 * one per buddy, exactly like AIM — so this dedups: a second open of the
 * same buddy (or the same saved log) focuses the existing window instead
 * of spawning a twin.
 */
import { useWindowStore } from './windowStore';

export function openIm(opts: {
  screenname?: string;
  alias?: string;
  logItemId?: string;
  fromWire?: boolean;
}): void {
  const store = useWindowStore.getState();
  const key = opts.screenname ?? opts.logItemId;
  const existing = store.windows.find(
    (w) =>
      w.appId === 'im' &&
      (w.props.screenname === opts.screenname && !!opts.screenname
        ? true
        : w.props.logItemId === opts.logItemId && !!opts.logItemId),
  );
  if (existing) {
    store.focus(existing.id);
    return;
  }
  const title = opts.screenname
    ? `${opts.screenname} - Instant Message`
    : 'Saved Conversation';
  store.open('im', { props: { ...opts, key }, title });
}
