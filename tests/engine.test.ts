import { describe, expect, it } from 'vitest';
import { handleAction, meetsRequirement } from '@gamecore/engine.ts';
import { newPlayerState, type GameAction, type PlayerState } from '@gamecore/types.ts';
import { SEASON1 } from '@gamecore/season1.ts';

const NOW = 1_000_000;
const LOGIN_PASSWORD = 'sunflower97'; // test-only knowledge; lives server-side in content

function run(state: PlayerState, action: GameAction, now = NOW) {
  return handleAction(SEASON1, state, action, now);
}

function loggedInState(): PlayerState {
  const s = newPlayerState();
  const { state } = run(s, { type: 'login', password: LOGIN_PASSWORD });
  return state;
}

describe('requirements', () => {
  it('evaluates discovery / opened / unlocked / flag leaves', () => {
    const s = newPlayerState();
    s.discoveries.push('d1');
    s.opened.push('o1');
    s.unlocked.push('u1');
    s.flags.f1 = true;
    expect(meetsRequirement(s, { discovery: 'd1' })).toBe(true);
    expect(meetsRequirement(s, { discovery: 'nope' })).toBe(false);
    expect(meetsRequirement(s, { opened: 'o1' })).toBe(true);
    expect(meetsRequirement(s, { unlocked: 'u1' })).toBe(true);
    expect(meetsRequirement(s, { flag: 'f1' })).toBe(true);
    expect(meetsRequirement(s, { flag: 'f2' })).toBe(false);
  });

  it('evaluates AND / OR combinations', () => {
    const s = newPlayerState();
    s.discoveries.push('a');
    expect(meetsRequirement(s, { all: [{ discovery: 'a' }, { discovery: 'b' }] })).toBe(false);
    expect(meetsRequirement(s, { any: [{ discovery: 'a' }, { discovery: 'b' }] })).toBe(true);
    expect(
      meetsRequirement(s, { all: [{ discovery: 'a' }, { any: [{ discovery: 'b' }, { flag: 'x' }] }] }),
    ).toBe(false);
  });
});

describe('computer login', () => {
  it('rejects wrong passwords and does not log in', () => {
    const { state, result } = run(newPlayerState(), { type: 'login', password: 'password123' });
    expect(result).toMatchObject({ type: 'login', ok: false });
    expect(state.loggedIn).toBe(false);
  });

  it('accepts the correct password (case/whitespace tolerant)', () => {
    const { state, result } = run(newPlayerState(), { type: 'login', password: '  SunFlower97 ' });
    expect(result).toMatchObject({ type: 'login', ok: true });
    expect(state.loggedIn).toBe(true);
  });

  it('locks out after too many failed attempts, then recovers after the window', () => {
    let s = newPlayerState();
    for (let i = 0; i < SEASON1.maxPasswordAttempts; i++) {
      s = run(s, { type: 'login', password: `guess${i}` }).state;
    }
    const locked = run(s, { type: 'login', password: LOGIN_PASSWORD });
    expect(locked.result).toMatchObject({ type: 'login', ok: false, lockedOut: true });

    const later = NOW + (SEASON1.lockoutSeconds + 1) * 1000;
    const after = run(s, { type: 'login', password: LOGIN_PASSWORD }, later);
    expect(after.result).toMatchObject({ type: 'login', ok: true });
  });

  it('refuses every game action before login', () => {
    const actions: GameAction[] = [
      { type: 'getDesktop' },
      { type: 'listChildren', parentId: 'folder.c' },
      { type: 'open', itemId: 'email.dana.please-write-back' },
      { type: 'visit', url: 'www.searchhound.net' },
      { type: 'search', query: 'overlook' },
      { type: 'getBuddies' },
    ];
    for (const action of actions) {
      const { result } = run(newPlayerState(), action);
      expect(result).toMatchObject({ type: 'error', error: 'not_logged_in' });
    }
  });
});

describe('clue chain progression', () => {
  it("walks the demo chain: email -> IM log -> diary -> demo end", () => {
    let s = loggedInState();

    // GhostBridge conversation is invisible before the email clue.
    let open = run(s, { type: 'open', itemId: 'im.ghostbridge' });
    expect(open.result).toMatchObject({ type: 'open', ok: false });

    // Reading Dana's email grants the overlook-plan discovery.
    open = run(s, { type: 'open', itemId: 'email.dana.please-write-back' });
    s = open.state;
    expect(open.result).toMatchObject({ type: 'open', ok: true });
    expect(s.discoveries).toContain('overlook-plan');

    // Now the IM log opens and grants ghostbridge-logs.
    open = run(s, { type: 'open', itemId: 'im.ghostbridge' });
    s = open.state;
    expect(open.result).toMatchObject({ type: 'open', ok: true });
    expect(s.discoveries).toContain('ghostbridge-logs');

    // The diary opens last and ends the demo.
    open = run(s, { type: 'open', itemId: 'file.oct-pages' });
    s = open.state;
    expect(open.result).toMatchObject({ type: 'open', ok: true, ended: true });
    expect(s.discoveries).toContain('third-screen-name');
    expect(s.ended).toBe(true);
  });

  it('reveals the GhostBridge buddy only after the email clue', () => {
    let s = loggedInState();
    let res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).not.toContain('GhostBridge');

    s = run(s, { type: 'open', itemId: 'email.dana.please-write-back' }).state;
    res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).toContain('GhostBridge');
  });

  it('discoveries are granted only once', () => {
    let s = loggedInState();
    let r = run(s, { type: 'open', itemId: 'email.dana.please-write-back' });
    s = r.state;
    expect(r.result).toMatchObject({ ok: true, newDiscoveries: [{ id: 'overlook-plan' }] });
    r = run(s, { type: 'open', itemId: 'email.dana.please-write-back' });
    if (r.result.type !== 'open') throw new Error('bad result');
    expect(r.result.newDiscoveries).toBeUndefined();
  });

  it('resetSeason returns a pristine state', () => {
    let s = loggedInState();
    s = run(s, { type: 'open', itemId: 'email.dana.please-write-back' }).state;
    const { state } = run(s, { type: 'resetSeason' });
    expect(state).toEqual(newPlayerState());
  });
});

describe('analytics events', () => {
  it('emits open/discovery events for meaningful actions only', () => {
    const s = loggedInState();
    const first = run(s, { type: 'open', itemId: 'email.dana.please-write-back' });
    expect(first.events.map((e) => e.type)).toEqual(['open', 'discovery']);
    const again = run(first.state, { type: 'open', itemId: 'email.dana.please-write-back' });
    expect(again.events).toHaveLength(0);
  });
});

describe('player documents (Notepad saves)', () => {
  it('requires login', () => {
    const { result } = run(newPlayerState(), {
      type: 'saveDocument',
      name: 'notes.txt',
      text: 'hi',
    });
    expect(result).toMatchObject({ type: 'error', error: 'not_logged_in' });
  });

  it('creates a document that appears on the desktop and opens editable', () => {
    let s = loggedInState();
    const saved = run(s, { type: 'saveDocument', name: 'my notes', text: 'GhostBridge = ???' });
    s = saved.state;
    expect(saved.result).toMatchObject({
      type: 'document',
      ok: true,
      item: { name: 'my notes.txt', editable: true },
    });
    const desktop = run(s, { type: 'getDesktop' }).result;
    if (desktop.type !== 'desktop') throw new Error('bad result');
    const doc = desktop.items.find((i) => i.name === 'my notes.txt');
    expect(doc?.editable).toBe(true);

    const open = run(s, { type: 'open', itemId: doc!.id }).result;
    if (open.type !== 'open' || !open.item) throw new Error('bad result');
    expect(open.item.body?.text).toBe('GhostBridge = ???');
    expect(open.item.editable).toBe(true);
  });

  it('updates an existing document by id', () => {
    let s = loggedInState();
    const created = run(s, { type: 'saveDocument', name: 'a.txt', text: 'v1' });
    s = created.state;
    const id = created.result.type === 'document' ? created.result.item!.id : '';
    s = run(s, { type: 'saveDocument', docId: id, name: 'a.txt', text: 'v2' }).state;
    const open = run(s, { type: 'open', itemId: id }).result;
    if (open.type !== 'open') throw new Error('bad result');
    expect(open.item?.body?.text).toBe('v2');
    expect(s.documents).toHaveLength(1);
  });

  it('sanitizes names and enforces the document cap', () => {
    let s = loggedInState();
    const weird = run(s, { type: 'saveDocument', name: '  ../..\\evil<>|  ', text: 'x' });
    s = weird.state;
    if (weird.result.type !== 'document') throw new Error('bad result');
    expect(weird.result.item!.name).not.toMatch(/[\\/<>|]/);

    for (let i = 0; i < 30; i++) {
      s = run(s, { type: 'saveDocument', name: `n${i}.txt`, text: 'x' }).state;
    }
    const over = run(s, { type: 'saveDocument', name: 'one-more.txt', text: 'x' });
    expect(over.result).toMatchObject({ type: 'document', ok: false, error: 'too_many' });
  });
});

describe('player folders', () => {
  it('creates a folder on the desktop and files documents into it', () => {
    let s = loggedInState();
    const created = run(s, { type: 'createFolder', name: 'case stuff' });
    s = created.state;
    if (created.result.type !== 'document' || !created.result.item) throw new Error('bad result');
    const folderId = created.result.item.id;
    expect(created.result.item.kind).toBe('folder');

    s = run(s, { type: 'saveDocument', name: 'timeline.txt', text: 'oct 10, 10pm' }).state;
    const docId = s.documents![0].id;
    s = run(s, { type: 'moveDocument', docId, folderId }).state;

    const desktop = run(s, { type: 'getDesktop' }).result;
    if (desktop.type !== 'desktop') throw new Error('bad result');
    expect(desktop.items.map((i) => i.id)).not.toContain(docId);
    expect(desktop.items.map((i) => i.id)).toContain(folderId);

    const children = run(s, { type: 'listChildren', parentId: folderId }).result;
    if (children.type !== 'children') throw new Error('bad result');
    expect(children.items.map((i) => i.id)).toContain(docId);
  });

  it('rejects moving into a nonexistent folder', () => {
    let s = loggedInState();
    s = run(s, { type: 'saveDocument', name: 'a.txt', text: 'x' }).state;
    const { result } = run(s, { type: 'moveDocument', docId: s.documents![0].id, folderId: 'playerfolder.999' });
    expect(result).toMatchObject({ type: 'document', ok: false });
  });
});
