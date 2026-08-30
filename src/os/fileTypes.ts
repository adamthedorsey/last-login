/** Win95 short stamp for list columns: "10/11/97 2:14 AM". Formatted straight
 * from the ISO string — these stamps are evidence, no Date() timezone drift. */
export function fmtShortStamp(iso?: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  let out = `${Number(m)}/${Number(d)}/${y.slice(2)}`;
  if (iso.length >= 16) {
    const hh = Number(iso.slice(11, 13));
    out += ` ${hh % 12 || 12}:${iso.slice(14, 16)} ${hh >= 12 ? 'PM' : 'AM'}`;
  }
  return out;
}

import type { ItemSummary } from '@gamecore/types.ts';

/** Menu enablement for "Copy to Desktop" — the engine is the real judge
 * (copyItem refuses anything without copyable text), this only predicts it. */
export function canCopyItem(item: ItemSummary): boolean {
  if (item.editable) return item.kind === 'document';
  if (item.meta?.photoSrc) return false;
  return ['document', 'email', 'im_conversation', 'trash_item'].includes(item.kind);
}

/** Win95 "Type" column / Properties names for each item kind. */
export const TYPE_NAMES: Record<string, string> = {
  folder: 'File Folder',
  document: 'Text Document',
  photo: 'GIF Image',
  shortcut: 'Shortcut',
  bookmark: 'Internet Shortcut',
  mailbox: 'Mail Folder',
  email: 'E-mail Message',
  im_conversation: 'Saved Conversation',
  trash_item: 'Deleted File',
  webpage: 'Internet Document',
};
