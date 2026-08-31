import type { ItemSummary } from '@gamecore/types.ts';
import { useWindowStore } from './windowStore';

/** Route a double-clicked item to the app that should handle it. */
export function launchItem(item: ItemSummary): void {
  const os = useWindowStore.getState();
  switch (item.kind) {
    case 'folder':
      if (item.id === 'folder.recycle') {
        os.open('recycle');
      } else {
        os.open('explorer', { props: { folderId: item.id }, title: item.name });
      }
      return;
    case 'document':
      os.open('notepad', { props: { itemId: item.id }, title: `${item.name} - Notepad` });
      return;
    case 'trash_item':
      if (item.meta?.photoSrc) {
        os.open('photos', { props: { itemId: item.id }, title: item.name });
      } else {
        os.open('notepad', { props: { itemId: item.id }, title: `${item.name} - Notepad` });
      }
      return;
    case 'audio':
      os.open('soundrec', { props: { itemId: item.id }, title: `${item.name} - Sound Recorder` });
      return;
    case 'photo':
      os.open('photos', {
        props: { folderId: item.parentId, itemId: item.id },
        title: item.name,
      });
      return;
    case 'shortcut':
      if (item.meta?.appId) os.open(item.meta.appId);
      return;
    case 'bookmark':
      if (item.meta?.url) os.open('browser', { props: { url: item.meta.url } });
      return;
    case 'email':
    case 'mailbox':
      os.open('mail');
      return;
    case 'im_conversation':
      os.open('buddyline', { props: { conversationId: item.id } });
      return;
    case 'webpage':
      if (item.meta?.url) os.open('browser', { props: { url: item.meta.url } });
      return;
    default:
      return;
  }
}
