import { describe, expect, it } from 'vitest';
import { handleAction, meetsRequirement } from '@gamecore/engine.ts';
import { newPlayerState, type GameAction, type PlayerState } from '@gamecore/types.ts';
import { SEASON1 } from '@gamecore/season1.ts';

const NOW = 1_000_000;
const LOGIN_PASSWORD = 'sunflower97'; // test-only knowledge; lives server-side in content

// The Season 1 chain, in order (see docs/clue-graph.md).
const CHAIN: Array<{ open: string; grants: string }> = [
  { open: 'email.sadie.please', grants: 'the-meeting' },
  { open: 'trash.bl-log', grants: 'stolen-intimacy' },
  { open: 'email.sadie.notchad', grants: 'chads-window' },
  { open: 'email.ruth.yourdad', grants: 'the-clean-truck' },
  { open: 'file.ledger-copy', grants: 'the-pipeline' },
  { open: 'email.rebecca', grants: 'who-shaped' },
  { open: 'trash.diary', grants: 'the-house' },
];

function run(state: PlayerState, action: GameAction, now = NOW) {
  return handleAction(SEASON1, state, action, now);
}

function loggedInState(): PlayerState {
  const s = newPlayerState();
  const logged = run(s, { type: 'login', password: LOGIN_PASSWORD }).state;
  // Most flows assume the player has dialed in.
  return run(logged, { type: 'connect' }).state;
}

function offlineState(): PlayerState {
  const s = newPlayerState();
  return run(s, { type: 'login', password: LOGIN_PASSWORD }).state;
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

  it('reveals the owner-typed hint only after two failed attempts, then permanently', () => {
    let s = newPlayerState();
    // First wrong attempt — the hint stays withheld.
    const first = run(s, { type: 'login', password: 'wrong0' });
    s = first.state;
    if (first.result.type !== 'login') throw new Error('bad result');
    expect(first.result.hint).toBeUndefined();

    // The second wrong attempt earns it.
    const second = run(s, { type: 'login', password: 'wrong1' });
    s = second.state;
    if (second.result.type !== 'login') throw new Error('bad result');
    expect(second.result.hint).toContain('flower');

    // Earned once, served always — including in the pre-login state view.
    const st = run(s, { type: 'getState' }).result;
    if (st.type !== 'state') throw new Error('bad result');
    expect(st.view.loginHint).toContain('flower');
  });

  it('reports the freeze duration when locked out', () => {
    let s = newPlayerState();
    for (let i = 0; i < SEASON1.maxPasswordAttempts; i++) {
      s = run(s, { type: 'login', password: `guess${i}` }).state;
    }
    const { result } = run(s, { type: 'login', password: 'anything' });
    if (result.type !== 'login') throw new Error('bad result');
    expect(result.lockedOut).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(SEASON1.lockoutSeconds);

    // The state view carries the freeze too, so a reload arrives locked...
    const frozen = run(s, { type: 'getState' }).result;
    if (frozen.type !== 'state') throw new Error('bad result');
    expect(frozen.view.loginLockSeconds).toBeGreaterThan(0);

    // ...and it clears once the engine's clock says so.
    const later = run(s, { type: 'getState' }, NOW + (SEASON1.lockoutSeconds + 1) * 1000).result;
    if (later.type !== 'state') throw new Error('bad result');
    expect(later.view.loginLockSeconds).toBeUndefined();
  });

  it('logout drops the session and gates actions again', () => {
    let s = loggedInState();
    const out = run(s, { type: 'logout' });
    s = out.state;
    expect(s.loggedIn).toBe(false);
    expect(run(s, { type: 'getDesktop' }).result).toMatchObject({
      type: 'error',
      error: 'not_logged_in',
    });
    // Logging back in works with the same password.
    expect(run(s, { type: 'login', password: LOGIN_PASSWORD }).result).toMatchObject({
      type: 'login',
      ok: true,
    });
  });

  it('refuses every game action before login', () => {
    const actions: GameAction[] = [
      { type: 'getDesktop' },
      { type: 'listChildren', parentId: 'folder.c' },
      { type: 'open', itemId: 'email.sadie.please' },
      { type: 'visit', url: 'www.searchhound.net' },
      { type: 'search', query: 'river' },
      { type: 'getBuddies' },
      { type: 'saveDocument', name: 'notes.txt', text: 'hi' },
    ];
    for (const action of actions) {
      const { result } = run(newPlayerState(), action);
      expect(result).toMatchObject({ type: 'error', error: 'not_logged_in' });
    }
  });
});

describe('clue chain progression', () => {
  it('walks the full Season 1 chain to the end of the demo', () => {
    let s = loggedInState();

    for (const [i, step] of CHAIN.entries()) {
      // Every later gated step must be closed before its turn comes.
      for (const later of CHAIN.slice(i + 1)) {
        const peek = run(s, { type: 'open', itemId: later.open }).result;
        if (peek.type === 'open' && peek.ok) {
          // Only allowed if the item is genuinely ungated (none are, past i).
          throw new Error(`${later.open} opened before its turn`);
        }
      }
      const { state, result } = run(s, { type: 'open', itemId: step.open });
      s = state;
      expect(result, step.open).toMatchObject({ type: 'open', ok: true });
      expect(s.discoveries, step.open).toContain(step.grants);
    }

    expect(s.ended).toBe(true);
    expect(s.discoveries).toHaveLength(CHAIN.length);
  });

  it('reveals the nightshift buddy only after stolen-intimacy', () => {
    let s = loggedInState();
    let res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).not.toContain('nightshift');

    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    s = run(s, { type: 'open', itemId: 'trash.bl-log' }).state;
    res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).toContain('nightshift');
  });

  it('discoveries are granted only once', () => {
    let s = loggedInState();
    let r = run(s, { type: 'open', itemId: 'email.sadie.please' });
    s = r.state;
    expect(r.result).toMatchObject({ ok: true, newDiscoveries: [{ id: 'the-meeting' }] });
    r = run(s, { type: 'open', itemId: 'email.sadie.please' });
    if (r.result.type !== 'open') throw new Error('bad result');
    expect(r.result.newDiscoveries).toBeUndefined();
  });

  it('resetSeason returns a pristine state', () => {
    let s = loggedInState();
    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    const { state } = run(s, { type: 'resetSeason' });
    expect(state).toEqual(newPlayerState());
  });
});

describe('dial-up', () => {
  it('starts offline: the web fails, buddies are unreachable, chat is dead', () => {
    const s = offlineState();
    expect(run(s, { type: 'visit', url: 'www.searchhound.net' }).result).toMatchObject({
      type: 'visit',
      ok: false,
      offline: true,
    });
    expect(run(s, { type: 'search', query: 'humble' }).result).toMatchObject({
      type: 'search',
      offline: true,
    });
    const buddies = run(s, { type: 'getBuddies' }).result;
    if (buddies.type !== 'buddies') throw new Error('bad result');
    expect(buddies.buddies.every((b) => b.status === 'offline')).toBe(true);
    expect(run(s, { type: 'getConversation', screenname: 'sadiedraws77' }).result).toMatchObject({
      type: 'chat',
      ok: false,
    });
  });

  it('local content still works offline: files, saved logs, downloaded mail', () => {
    const s = offlineState();
    expect(run(s, { type: 'open', itemId: 'file.minewars-report' }).result).toMatchObject({ ok: true });
    expect(run(s, { type: 'open', itemId: 'im.sadie' }).result).toMatchObject({ ok: true });
    expect(run(s, { type: 'open', itemId: 'email.sadie.please' }).result).toMatchObject({ ok: true });
  });

  it('connect and disconnect flip the shared state', () => {
    let s = offlineState();
    const on = run(s, { type: 'connect' });
    s = on.state;
    expect(on.result).toMatchObject({ type: 'net', online: true });
    const view = run(s, { type: 'getState' }).result;
    if (view.type !== 'state') throw new Error('bad result');
    expect(view.view.online).toBe(true);
    const off = run(s, { type: 'disconnect' });
    expect(off.result).toMatchObject({ type: 'net', online: false });
  });

  it('wire mail arrives only online, and stays delivered after hanging up', () => {
    // Earn stolen-intimacy fully OFFLINE (both Act 1 items are local disk).
    let s = offlineState();
    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    s = run(s, { type: 'open', itemId: 'trash.bl-log' }).state;
    expect(s.discoveries).toContain('stolen-intimacy');

    // Sadie's second email is eligible — but it has not ARRIVED.
    expect(run(s, { type: 'open', itemId: 'email.sadie.notchad' }).result).toMatchObject({
      type: 'open',
      ok: false,
    });
    const inbox = run(s, { type: 'listChildren', parentId: 'mailbox.inbox' }).result;
    if (inbox.type !== 'children') throw new Error('bad result');
    expect(inbox.items.map((i) => i.id)).not.toContain('email.sadie.notchad');

    // Dial in: the mail truck comes.
    const on = run(s, { type: 'connect' });
    s = on.state;
    if (on.result.type !== 'net') throw new Error('bad result');
    expect(on.result.newMail).toBeGreaterThan(0);
    expect(run(s, { type: 'open', itemId: 'email.sadie.notchad' }).result).toMatchObject({ ok: true });

    // Hang up: the letter is on the disk now.
    s = run(s, { type: 'disconnect' }).state;
    expect(run(s, { type: 'open', itemId: 'email.sadie.notchad' }).result).toMatchObject({ ok: true });
  });
});

describe('the modem log (path B to the finale)', () => {
  it('is invisible until who-shaped, then grants the-house', () => {
    let s = loggedInState();
    expect(run(s, { type: 'open', itemId: 'file.modem-log' }).result).toMatchObject({
      type: 'open',
      ok: false,
    });
    for (const step of CHAIN.slice(0, 6)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    expect(s.discoveries).toContain('who-shaped');
    const fin = run(s, { type: 'open', itemId: 'file.modem-log' });
    expect(fin.result).toMatchObject({ type: 'open', ok: true, ended: true });
    expect(fin.state.discoveries).toContain('the-house');
  });
});

describe('the line pickup', () => {
  function whoShapedOnline(): PlayerState {
    let s = loggedInState();
    for (const step of CHAIN.slice(0, 6)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    return s;
  }

  it('the next online action after who-shaped gets the line yanked, once', () => {
    let s = whoShapedOnline();
    expect(s.online).toBe(true);

    // The very next action: somebody picks up the extension. The dropping
    // result itself carries the notice so the client can't miss it.
    const dropped = run(s, { type: 'getDesktop' });
    s = dropped.state;
    expect(s.online).toBe(false);
    expect(s.flags['line-pickup-done']).toBe(true);
    expect(dropped.result.linePickup).toBe(true);
    expect(dropped.events.some((e) => e.type === 'net_line_pickup')).toBe(true);

    // The view tells the client (once-shown logic lives client-side).
    const view = run(s, { type: 'getState' }).result;
    if (view.type !== 'state') throw new Error('bad result');
    expect(view.view.linePickup).toBe(true);
    expect(view.view.online).toBe(false);

    // Reconnecting sticks — the scare never repeats.
    s = run(s, { type: 'connect' }).state;
    s = run(s, { type: 'getDesktop' }).state;
    expect(s.online).toBe(true);
  });

  it('never fires while offline or before the condition', () => {
    let s = loggedInState();
    s = run(s, { type: 'getDesktop' }).state;
    expect(s.online).toBe(true);
    expect(s.flags['line-pickup-done']).toBeUndefined();
  });
});

describe('live conversations', () => {
  function saySadie(s: PlayerState, promptId: string) {
    return run(s, { type: 'say', screenname: 'sadiedraws77', promptId });
  }

  it('offers only ungated prompts, and grants the-meeting through chat', () => {
    let s = loggedInState();
    let res = run(s, { type: 'getConversation', screenname: 'sadiedraws77' }).result;
    if (res.type !== 'chat' || !res.chat) throw new Error('bad result');
    expect(res.chat.prompts.map((p) => p.id)).toEqual(['intro']);
    expect(res.chat.messages.length).toBeGreaterThan(0); // the opener

    const said = saySadie(s, 'intro');
    s = said.state;
    expect(s.discoveries).toContain('the-meeting');
    if (said.result.type !== 'chat' || !said.result.chat) throw new Error('bad result');
    // Follow-ups unlock; the gated late-act branches stay hidden.
    const ids = said.result.chat.prompts.map((p) => p.id);
    expect(ids).toContain('online-guy');
    expect(ids).toContain('about-her');
    expect(ids).not.toContain('frank');
    expect(ids).not.toContain('vigil');
  });

  it('prompts are one-shot and unavailable prompts are refused', () => {
    let s = loggedInState();
    s = saySadie(s, 'intro').state;
    expect(saySadie(s, 'intro').result).toMatchObject({ type: 'chat', ok: false });
    expect(saySadie(s, 'vigil').result).toMatchObject({ type: 'chat', ok: false });
  });

  it('walks the whole season on PATH B: chat, file, web, email alternates', () => {
    let s = loggedInState();
    s = saySadie(s, 'intro').state; // -> the-meeting
    s = run(s, { type: 'open', itemId: 'file.gb-log-oct8' }).state; // -> stolen-intimacy
    s = run(s, { type: 'visit', url: 'www.humbleregister.net/timeline' }).state; // -> chads-window
    s = saySadie(s, 'frank').state; // -> the-clean-truck
    s = run(s, { type: 'open', itemId: 'email.sam.plain' }).state; // -> the-pipeline
    s = saySadie(s, 'vigil').state; // -> who-shaped
    const fin = run(s, { type: 'open', itemId: 'trash.diary' });
    expect(fin.result).toMatchObject({ type: 'open', ok: true, ended: true });
    expect(fin.state.discoveries).toHaveLength(CHAIN.length);
  });
});

describe('the epilogue', () => {
  function finishedState(): PlayerState {
    let s = loggedInState();
    for (const step of CHAIN) s = run(s, { type: 'open', itemId: step.open }).state;
    // The extension pickup yanked the line after who-shaped; dial back in
    // to meet him. (He was always going to be waiting.)
    return run(s, { type: 'connect' }).state;
  }

  it('nightshift is unreachable before the finale', () => {
    const s = loggedInState();
    const res = run(s, { type: 'getConversation', screenname: 'nightshift' }).result;
    expect(res).toMatchObject({ type: 'chat', ok: false });
  });

  it('he signs on after the finale, and the word makes him sign off for good', () => {
    let s = finishedState();
    let buddies = run(s, { type: 'getBuddies' }).result;
    if (buddies.type !== 'buddies') throw new Error('bad result');
    expect(buddies.buddies.find((b) => b.screenname === 'nightshift')?.status).toBe('online');

    const opened = run(s, { type: 'getConversation', screenname: 'nightshift' }).result;
    if (opened.type !== 'chat' || !opened.chat) throw new Error('bad result');
    expect(opened.chat.messages[0].text).toContain('up late');

    const sting = run(s, { type: 'say', screenname: 'nightshift', promptId: 'junebug' });
    s = sting.state;
    if (sting.result.type !== 'chat' || !sting.result.chat) throw new Error('bad result');
    expect(sting.result.chat.signedOff).toBe(true);
    expect(sting.result.chat.prompts).toHaveLength(0);

    buddies = run(s, { type: 'getBuddies' }).result;
    if (buddies.type !== 'buddies') throw new Error('bad result');
    expect(buddies.buddies.find((b) => b.screenname === 'nightshift')?.status).toBe('offline');
    expect(run(s, { type: 'getConversation', screenname: 'nightshift' }).result).toMatchObject({
      type: 'chat',
      ok: false,
    });
  });
});

describe('analytics events', () => {
  it('emits open/discovery events for meaningful actions only', () => {
    const s = loggedInState();
    const first = run(s, { type: 'open', itemId: 'email.sadie.please' });
    expect(first.events.map((e) => e.type)).toEqual(['open', 'discovery']);
    const again = run(first.state, { type: 'open', itemId: 'email.sadie.please' });
    expect(again.events).toHaveLength(0);
  });
});

describe('player documents (Notepad saves)', () => {
  it('creates a document that appears on the desktop and opens editable', () => {
    let s = loggedInState();
    const saved = run(s, { type: 'saveDocument', name: 'my notes', text: 'nightshift = ???' });
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
    expect(open.item.body?.text).toBe('nightshift = ???');
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
  it('creates a folder and files documents in and back out', () => {
    let s = loggedInState();
    const created = run(s, { type: 'createFolder', name: 'case stuff' });
    s = created.state;
    if (created.result.type !== 'document' || !created.result.item) throw new Error('bad result');
    const folderId = created.result.item.id;

    s = run(s, { type: 'saveDocument', name: 'timeline.txt', text: 'oct 10, 10pm' }).state;
    const docId = s.documents![0].id;
    s = run(s, { type: 'moveDocument', docId, folderId }).state;

    let desktop = run(s, { type: 'getDesktop' }).result;
    if (desktop.type !== 'desktop') throw new Error('bad result');
    expect(desktop.items.map((i) => i.id)).not.toContain(docId);

    const children = run(s, { type: 'listChildren', parentId: folderId }).result;
    if (children.type !== 'children') throw new Error('bad result');
    expect(children.items.map((i) => i.id)).toContain(docId);

    s = run(s, { type: 'moveDocument', docId }).state;
    desktop = run(s, { type: 'getDesktop' }).result;
    if (desktop.type !== 'desktop') throw new Error('bad result');
    expect(desktop.items.map((i) => i.id)).toContain(docId);
  });

  it('rejects moving into a nonexistent folder', () => {
    let s = loggedInState();
    s = run(s, { type: 'saveDocument', name: 'a.txt', text: 'x' }).state;
    const { result } = run(s, {
      type: 'moveDocument',
      docId: s.documents![0].id,
      folderId: 'playerfolder.999',
    });
    expect(result).toMatchObject({ type: 'document', ok: false });
  });
});

describe('renaming', () => {
  it('renames player documents and folders, never story items', () => {
    let s = loggedInState();
    s = run(s, { type: 'saveDocument', name: 'a.txt', text: 'x' }).state;
    s = run(s, { type: 'createFolder', name: 'stuff' }).state;

    s = run(s, { type: 'renameItem', itemId: s.documents![0].id, name: 'evidence notes' }).state;
    s = run(s, { type: 'renameItem', itemId: s.folders![0].id, name: 'the case' }).state;
    expect(s.documents![0].name).toBe('evidence notes.txt');
    expect(s.folders![0].name).toBe('the case');

    const denied = run(s, { type: 'renameItem', itemId: 'file.ledger-copy', name: 'haha' });
    expect(denied.result).toMatchObject({ type: 'document', ok: false });
  });
});

describe('find files', () => {
  const findIds = (s: PlayerState, query: string, text?: string): string[] => {
    const { result } = run(s, { type: 'findFiles', query, text });
    return result.type === 'find' ? result.items.map((i) => i.id) : [];
  };

  it('finds accessible files by name with their In Folder path', () => {
    const s = offlineState(); // the disk search must not require dial-up
    const { result } = run(s, { type: 'findFiles', query: 'lists' });
    expect(result.type).toBe('find');
    if (result.type !== 'find') return;
    const hit = result.items.find((i) => i.id === 'file.lists');
    expect(hit?.path).toBe('C:\\My Documents\\personal stuff');
  });

  it('searches file contents, but only bodies the player could open', () => {
    const s = offlineState();
    expect(findIds(s, '', 'maxell')).toContain('file.lists');
  });

  it('never surfaces gated files before their requirement is met', () => {
    const s = offlineState();
    expect(findIds(s, 'modem')).not.toContain('file.modem-log');
    // Nor by content: the smoking-gun session must not be text-searchable early.
    expect(findIds(s, '', '00:09:12')).toHaveLength(0);
  });

  it('surfaces gated files once they are earned', () => {
    let s = loggedInState();
    for (const step of CHAIN.slice(0, 6)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    expect(s.discoveries).toContain('who-shaped');
    expect(findIds(s, 'modem')).toContain('file.modem-log');
  });

  it('finds the player own saved notes on the desktop', () => {
    let s = offlineState();
    s = run(s, { type: 'saveDocument', name: 'case notes.txt', text: 'junebug?' }).state;
    const { result } = run(s, { type: 'findFiles', query: 'case notes' });
    expect(result.type === 'find' && result.items.some((i) => i.path === 'C:\\Desktop')).toBe(true);
  });
});

describe('scheduled events', () => {
  const EVENT = 'evt.angel-forward'; // 420s into a connection, no other gate
  const EVENT_MAIL = 'email.angel.chain2';

  const inboxIds = (s: PlayerState, now: number): string[] => {
    const res = run(s, { type: 'listChildren', parentId: 'mailbox.inbox' }, now).result;
    return res.type === 'children' ? res.items.map((i) => i.id) : [];
  };

  it('does not fire before its delay has elapsed', () => {
    const s = loggedInState(); // connected at NOW
    const { state, result } = run(s, { type: 'checkMail' }, NOW + 60_000);
    expect(state.firedEvents ?? []).not.toContain(EVENT);
    expect(result.wire).toBeUndefined();
    expect(inboxIds(state, NOW + 60_000)).not.toContain(EVENT_MAIL);
  });

  it('fires once due: sets flags, delivers the gated mail, stamps a wire notice', () => {
    const s = loggedInState();
    const later = NOW + 421_000;
    const { state, result } = run(s, { type: 'checkMail' }, later);
    expect(state.firedEvents).toContain(EVENT);
    expect(state.flags['angel-sent-luck']).toBe(true);
    expect(state.delivered).toContain(EVENT_MAIL);
    expect(result.wire?.some((w) => w.kind === 'mail')).toBe(true);
    expect(result).toMatchObject({ type: 'net', online: true, newMail: 1 });
    expect(inboxIds(state, later)).toContain(EVENT_MAIL);
  });

  it('fires exactly once per season', () => {
    const s = loggedInState();
    const first = run(s, { type: 'checkMail' }, NOW + 421_000);
    const second = run(first.state, { type: 'checkMail' }, NOW + 900_000);
    // Later sweeps may fire OTHER events, but never this one again.
    expect(second.result.wire?.some((w) => w.kind === 'mail')).toBeFalsy();
    expect(second.state.firedEvents?.filter((id) => id === EVENT)).toHaveLength(1);
  });

  it('never ticks while offline', () => {
    const s = offlineState();
    const { state } = run(s, { type: 'getDesktop' }, NOW + 10_000_000);
    expect(state.firedEvents ?? []).not.toContain(EVENT);
  });

  it('measures its delay against the CURRENT connection, not wall time', () => {
    let s = loggedInState();
    s = run(s, { type: 'disconnect' }, NOW + 300_000).state;
    s = run(s, { type: 'connect' }, NOW + 400_000).state;
    // 500s of wall time have passed, but only 100s of this connection.
    const { state } = run(s, { type: 'checkMail' }, NOW + 500_000);
    expect(state.firedEvents ?? []).not.toContain(EVENT);
  });

  it('the delivered mail persists offline like anything else on the disk', () => {
    let s = loggedInState();
    s = run(s, { type: 'checkMail' }, NOW + 421_000).state;
    s = run(s, { type: 'disconnect' }, NOW + 422_000).state;
    expect(inboxIds(s, NOW + 423_000)).toContain(EVENT_MAIL);
  });
});

describe('live buddy list', () => {
  const buddyStatus = (s: PlayerState, name: string, now: number) => {
    const res = run(s, { type: 'getBuddies' }, now).result;
    return res.type === 'buddies' ? res.buddies.find((b) => b.screenname === name) : undefined;
  };

  it('flips Angel online a couple of minutes into a session', () => {
    let s = loggedInState();
    expect(buddyStatus(s, 'AngelJx', NOW)?.status).toBe('away');
    s = run(s, { type: 'checkMail' }, NOW + 151_000).state;
    expect(buddyStatus(s, 'AngelJx', NOW + 151_000)?.status).toBe('online');
  });

  it('puts Angel back on away, reworded, when her mom comes in', () => {
    let s = loggedInState();
    s = run(s, { type: 'checkMail' }, NOW + 600_000).state;
    const angel = buddyStatus(s, 'AngelJx', NOW + 600_000);
    expect(angel?.status).toBe('away');
    expect(angel?.awayMessage).toContain('HOMEWORK');
  });

  it('marks Sadie idle late in a long session — and she still answers', () => {
    let s = loggedInState();
    s = run(s, { type: 'checkMail' }, NOW + 601_000).state;
    expect(buddyStatus(s, 'sadiedraws77', NOW + 601_000)?.status).toBe('idle');
    const chat = run(s, { type: 'getConversation', screenname: 'sadiedraws77' }, NOW + 601_000).result;
    expect(chat).toMatchObject({ type: 'chat', ok: true });
  });

  it('Sadie messages first once introduced: interjection lands after the intro exchange', () => {
    let s = loggedInState();
    s = run(s, { type: 'say', screenname: 'sadiedraws77', promptId: 'intro' }).state;
    // Before the event: no unprompted lines.
    const before = run(s, { type: 'getConversation', screenname: 'sadiedraws77' }, NOW + 10_000).result;
    expect(before.type === 'chat' && before.chat?.messages.some((m) => m.text.includes('you still there?'))).toBe(false);
    // The knock fires four minutes in and carries an 'im' wire notice.
    const tick = run(s, { type: 'checkMail' }, NOW + 241_000);
    expect(tick.result.wire?.some((w) => w.kind === 'im' && w.screenname === 'sadiedraws77')).toBe(true);
    const after = run(tick.state, { type: 'getConversation', screenname: 'sadiedraws77' }, NOW + 242_000).result;
    expect(after.type === 'chat' && after.chat?.messages.some((m) => m.text.includes('you still there?'))).toBe(true);
  });

  it('never knocks if the player has not introduced themselves', () => {
    const s = loggedInState();
    const { result } = run(s, { type: 'checkMail' }, NOW + 241_000);
    expect(result.wire?.some((w) => w.kind === 'im')).toBeFalsy();
  });

  it('rings the epilogue doorbell on the first sweep online after the finale', () => {
    let s = loggedInState();
    for (const step of CHAIN) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    expect(s.discoveries).toContain('the-house');
    // The line-pickup scare dropped the connection mid-chain (who-shaped);
    // he signs on the moment the player dials back in.
    expect(s.online).toBeFalsy();
    const { result } = run(s, { type: 'connect' }, NOW + 2_000);
    expect(result.wire?.some((w) => w.kind === 'buddy-on')).toBe(true);
  });
});

describe('email attachments', () => {
  it('serves attachments as children of a readable mail', () => {
    const s = loggedInState();
    const res = run(s, { type: 'listChildren', parentId: 'email.angel.chain' }).result;
    expect(res.type === 'children' && res.items.some((i) => i.id === 'attach.fair-scan')).toBe(true);
  });

  it('gates an attachment with its mail: unreachable until the mail is delivered', () => {
    let s = loggedInState();
    const early = run(s, { type: 'open', itemId: 'attach.board-letter' }).result;
    expect(early).toMatchObject({ type: 'open', ok: false });
    // Earn through the-clean-truck; the next sweep delivers Sam's letter.
    for (const step of CHAIN.slice(0, 4)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    s = run(s, { type: 'checkMail' }).state;
    expect(s.delivered).toContain('email.sam.plain');
    const late = run(s, { type: 'open', itemId: 'attach.board-letter' }).result;
    expect(late).toMatchObject({ type: 'open', ok: true });
  });
});

describe('remote access', () => {
  /** Earn the-pipeline while online (linePickup waits for who-shaped). */
  const reachPipeline = (): PlayerState => {
    let s = loggedInState();
    for (const step of CHAIN.slice(0, 5)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    expect(s.discoveries).toContain('the-pipeline');
    expect(s.online).toBe(true);
    return s;
  };

  it('withholds the script until the takeover has triggered', () => {
    const s = loggedInState();
    expect(run(s, { type: 'getRemoteSession' }).result).toMatchObject({
      type: 'remote',
      ok: false,
    });
  });

  it('triggers a minute into a session once the pipeline is known', () => {
    const s = reachPipeline();
    const tick = run(s, { type: 'checkMail' }, NOW + 61_000);
    expect(tick.result.wire?.some((w) => w.kind === 'remote')).toBe(true);
    const view = run(tick.state, { type: 'getState' }, NOW + 61_000).result;
    expect(view.type === 'state' && view.view.remotePending).toBe(true);
    const script = run(tick.state, { type: 'getRemoteSession' }, NOW + 62_000).result;
    expect(script.type === 'remote' && script.ok && (script.script?.length ?? 0) > 0).toBe(true);
  });

  it('acknowledging grants the-watcher, drops the line, and never replays', () => {
    const s = reachPipeline();
    const triggered = run(s, { type: 'checkMail' }, NOW + 61_000).state;
    const done = run(triggered, { type: 'remoteSessionDone' }, NOW + 90_000);
    expect(done.result).toMatchObject({ type: 'remote', ok: true });
    expect(
      done.result.type === 'remote' &&
        done.result.newDiscoveries?.some((d) => d.id === 'the-watcher'),
    ).toBe(true);
    expect(done.state.online).toBeFalsy();
    // Watched once: no longer pending, and it never re-triggers.
    const view = run(done.state, { type: 'getState' }, NOW + 91_000).result;
    expect(view.type === 'state' && view.view.remotePending).toBeFalsy();
    let s2 = run(done.state, { type: 'connect' }, NOW + 100_000).state;
    s2 = run(s2, { type: 'checkMail' }, NOW + 200_000).state;
    expect(run(s2, { type: 'getRemoteSession' }, NOW + 201_000).result).toMatchObject({
      type: 'remote',
      ok: false,
    });
  });

  it('does not trigger for a player who lacks the discovery, however long they idle', () => {
    const s = loggedInState();
    const { state } = run(s, { type: 'checkMail' }, NOW + 3_600_000);
    expect(state.firedEvents ?? []).not.toContain('remote.ghost-checkin');
  });
});

describe('case file', () => {
  const memoIds = (s: PlayerState): string[] => {
    const res = run(s, { type: 'getCaseFile' }).result;
    return res.type === 'casefile' ? res.view.messages.map((m) => m.id) : [];
  };

  it('serves nothing to a fresh player — the standing orders live in the setup wizard now', () => {
    const s = offlineState();
    const ids = memoIds(s);
    expect(ids).toHaveLength(0);
    // After first-run setup, the briefing is on file; gated memos still are not.
    const on = run(s, { type: 'connect' }).state;
    const done = run(on, { type: 'caseFileSync' }).state;
    const after = memoIds(done);
    expect(after).toContain('hm.briefing');
    expect(after).not.toContain('hm.careful');
    expect(after).not.toContain('hm.callme');
  });

  it('reacts to progress: new memos appear as discoveries land', () => {
    let s = loggedInState();
    for (const step of CHAIN.slice(0, 5)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    const ids = memoIds(s);
    expect(ids).toContain('hm.river');
    expect(ids).toContain('hm.careful');
    expect(ids).not.toContain('hm.callme');
  });

  it('never leaks gates: memos carry only display fields', () => {
    const s = offlineState();
    const res = run(s, { type: 'getCaseFile' }).result;
    expect(res.type).toBe('casefile');
    if (res.type !== 'casefile') return;
    for (const m of res.view.messages) {
      expect(Object.keys(m).sort()).toEqual(
        expect.not.arrayContaining(['requires', 'lines']),
      );
      expect(typeof m.text).toBe('string');
    }
  });
});

describe('workspace copies', () => {
  it('snapshots an email with its envelope; the copy is a normal player doc', () => {
    const s = offlineState();
    const { state, result } = run(s, { type: 'copyItem', itemId: 'email.chad.sorry' });
    expect(result).toMatchObject({ type: 'document', ok: true });
    const doc = (state.documents ?? [])[0];
    expect(doc?.name).toBe('Copy of im sorry ok.txt');
    expect(doc?.text).toContain('From: chad daniels');
    expect(doc?.text).toContain('Subject: im sorry ok');
    const renamed = run(state, { type: 'renameItem', itemId: doc!.id, name: 'chad alibi.txt' });
    expect(renamed.result).toMatchObject({ type: 'document', ok: true });
  });

  it('copying an unread original counts as reading it', () => {
    let s = loggedInState();
    for (const step of CHAIN.slice(0, 4)) {
      s = run(s, { type: 'open', itemId: step.open }).state;
    }
    const { state, result } = run(s, { type: 'copyItem', itemId: 'file.ledger-copy' });
    expect(
      result.type === 'document' && result.newDiscoveries?.some((d) => d.id === 'the-pipeline'),
    ).toBe(true);
    expect(state.discoveries).toContain('the-pipeline');
  });

  it('refuses items the player cannot reach, and items without text', () => {
    const s = offlineState();
    expect(run(s, { type: 'copyItem', itemId: 'file.ledger-copy' }).result).toMatchObject({
      type: 'document',
      ok: false,
      error: 'not_found',
    });
    // Folders have nothing to flatten.
    expect(run(s, { type: 'copyItem', itemId: 'folder.pictures' }).result).toMatchObject({
      type: 'document',
      ok: false,
      error: 'not_supported',
    });
  });

  it('copies a photo as a reference card (the image itself stays put)', () => {
    const s = offlineState();
    const { state, result } = run(s, { type: 'copyItem', itemId: 'photo.fair' });
    expect(result).toMatchObject({ type: 'document', ok: true });
    if (result.type !== 'document' || !result.item) throw new Error('bad result');
    const opened = run(state, { type: 'open', itemId: result.item.id }).result;
    if (opened.type !== 'open' || !opened.item) throw new Error('bad result');
    expect(opened.item.body?.text).toContain('[Photograph');
  });

  it('duplicates a player document beside the original', () => {
    let s = offlineState();
    s = run(s, { type: 'saveDocument', name: 'notes.txt', text: 'junebug?' }).state;
    const docId = (s.documents ?? [])[0].id;
    const { state, result } = run(s, { type: 'copyItem', itemId: docId });
    expect(result).toMatchObject({ type: 'document', ok: true });
    expect(state.documents?.map((d) => d.name)).toContain('Copy of notes.txt');
  });

  it('enforces the workspace document cap', () => {
    let s = offlineState();
    for (let i = 0; i < 24; i++) {
      s = run(s, { type: 'saveDocument', name: `n${i}.txt`, text: 'x' }).state;
    }
    expect(run(s, { type: 'copyItem', itemId: 'email.chad.sorry' }).result).toMatchObject({
      type: 'document',
      ok: false,
      error: 'too_many',
    });
  });
});

describe('phone dialer', () => {
  it('cannot get a dial tone while the modem holds the line', () => {
    const s = loggedInState(); // online
    const { result } = run(s, { type: 'dial', number: '555-0101' });
    expect(result).toMatchObject({ type: 'dial', lineBusy: true });
  });

  it('reads the frozen clock back on the time line', () => {
    const s = offlineState();
    const { result } = run(s, { type: 'dial', number: '555-0101' });
    expect(result.type).toBe('dial');
    if (result.type !== 'dial') return;
    expect(result.outcome).toBe('message');
    expect(result.message?.join(' ')).toContain('9:47 PM');
  });

  it('unlisted numbers just ring', () => {
    const s = offlineState();
    const { result } = run(s, { type: 'dial', number: '555-9999' });
    expect(result).toMatchObject({ type: 'dial', outcome: 'no-answer' });
  });

  it('dialing the access number by voice reaches a modem', () => {
    const s = offlineState();
    const { result } = run(s, { type: 'dial', number: '5550134' });
    expect(result).toMatchObject({ type: 'dial', outcome: 'message', carrier: true });
  });

  it('serves the owner speed-dial entries', () => {
    const s = offlineState();
    const { result } = run(s, { type: 'getSpeedDial' });
    expect(result.type === 'speedDial' && result.entries.length >= 3).toBe(true);
  });
});

describe('case files setup', () => {
  it('serves the wizard until the first sync, then never again', () => {
    const s = offlineState();
    const before = run(s, { type: 'getCaseFile' }).result;
    expect(before.type === 'casefile' && (before.view.setup?.length ?? 0) > 0).toBe(true);
    // The opening briefing is not on file until setup completes.
    expect(before.type === 'casefile' && before.view.messages.length).toBe(0);

    // Offline, the sync step is refused and nothing is marked done.
    const refused = run(s, { type: 'caseFileSync' });
    expect(refused.result).toMatchObject({ type: 'casefile', offline: true });
    expect(refused.state.flags['case-setup-done']).toBeUndefined();

    // Online, the sync completes setup and unlocks the briefing.
    const on = run(refused.state, { type: 'connect' }).state;
    const synced = run(on, { type: 'caseFileSync' });
    expect(synced.state.flags['case-setup-done']).toBe(true);
    const v = synced.result;
    expect(v.type === 'casefile' && v.view.setup === undefined).toBe(true);
    expect(v.type === 'casefile' && v.view.messages.some((m) => m.audioSrc)).toBe(true);

    // The wizard never comes back.
    const again = run(synced.state, { type: 'getCaseFile' }).result;
    expect(again.type === 'casefile' && again.view.setup === undefined).toBe(true);
  });

  it('puts README.TXT on the desktop as read-only evidence', () => {
    const s = offlineState();
    const desk = run(s, { type: 'getDesktop' }).result;
    expect(desk.type === 'desktop' && desk.items.some((i) => i.id === 'file.start-here')).toBe(true);
    const denied = run(s, { type: 'renameItem', itemId: 'file.start-here', name: 'x.txt' });
    expect(denied.result).toMatchObject({ type: 'document', ok: false });
  });
});

describe('case files workspace', () => {
  it('deletes only the player own documents, never evidence', () => {
    let s = offlineState();
    s = run(s, { type: 'saveDocument', name: 'scratch.txt', text: 'x' }).state;
    const docId = s.documents![0].id;
    const okRes = run(s, { type: 'deleteDocument', docId });
    expect(okRes.result).toMatchObject({ type: 'document', ok: true });
    expect(okRes.state.documents).toHaveLength(0);

    const denied = run(okRes.state, { type: 'deleteDocument', docId: 'file.ledger-copy' });
    expect(denied.result).toMatchObject({ type: 'document', ok: false });
  });

  it('serves the case summary and the getting-started guide', () => {
    const s = offlineState();
    const res = run(s, { type: 'getCaseFile' }).result;
    expect(res.type).toBe('casefile');
    if (res.type !== 'casefile') return;
    expect(res.view.summary?.join(' ')).toContain('MISSING');
    expect((res.view.guide?.length ?? 0)).toBeGreaterThan(0);
  });
});

describe('save to case files', () => {
  it('evidence snapshots land in the Case Files space, not the desktop', () => {
    let s = offlineState();
    s = run(s, { type: 'copyItem', itemId: 'file.lists' }).state;
    const desk = run(s, { type: 'getDesktop' }).result;
    expect(desk.type === 'desktop' && desk.items.some((i) => i.name.startsWith('Copy of'))).toBe(false);
    const cf = run(s, { type: 'listChildren', parentId: 'casefile' }).result;
    expect(cf.type === 'children' && cf.items.some((i) => i.name === 'Copy of lists.txt')).toBe(true);
  });

  it('notes can be created directly in Case Files', () => {
    let s = offlineState();
    s = run(s, { type: 'saveDocument', name: 'leads.txt', text: 'x', folderId: 'casefile' }).state;
    const cf = run(s, { type: 'listChildren', parentId: 'casefile' }).result;
    expect(cf.type === 'children' && cf.items.some((i) => i.name === 'leads.txt')).toBe(true);
    const desk = run(s, { type: 'getDesktop' }).result;
    expect(desk.type === 'desktop' && desk.items.some((i) => i.name === 'leads.txt')).toBe(false);
  });
});

describe('evidence copy links', () => {
  it('copies carry sourceId, and Case Files docs never surface in Find', () => {
    let s = offlineState();
    s = run(s, { type: 'copyItem', itemId: 'file.lists' }).state;
    const cf = run(s, { type: 'listChildren', parentId: 'casefile' }).result;
    if (cf.type !== 'children') throw new Error('bad result');
    expect(cf.items[0]?.meta?.sourceId).toBe('file.lists');

    const found = run(s, { type: 'findFiles', query: 'Copy of' }).result;
    expect(found.type === 'find' && found.items).toHaveLength(0);
  });
});

describe('sound files and audio notes', () => {
  it("serves Casey's audio files with their recording metadata", () => {
    const s = offlineState();
    const kids = run(s, { type: 'listChildren', parentId: 'folder.my-documents' }).result;
    if (kids.type !== 'children') throw new Error('bad result');
    const wav = kids.items.find((i) => i.id === 'audio.band-practice');
    expect(wav?.kind).toBe('audio');
    expect(wav?.meta?.audioSrc).toContain('/audio/');
    expect(wav?.meta?.audioSeconds).toBeGreaterThan(0);
  });

  it('saves, serves and deletes audio notes with hard caps', () => {
    let s = offlineState();
    const good = 'data:audio/webm;base64,' + 'A'.repeat(2000);
    const saved = run(s, { type: 'saveAudioNote', dataUrl: good });
    expect(saved.result.type).toBe('casefile');
    s = saved.state;
    expect(s.audioNotes).toHaveLength(1);
    expect(s.audioNotes![0].name).toContain('Audio Note');

    // wrong mime and oversized payloads are refused
    expect(run(s, { type: 'saveAudioNote', dataUrl: 'data:text/html,x' }).result).toMatchObject({
      type: 'document',
      ok: false,
    });
    expect(
      run(s, { type: 'saveAudioNote', dataUrl: 'data:audio/webm;base64,' + 'A'.repeat(1_300_000) })
        .result,
    ).toMatchObject({ type: 'document', ok: false });

    const gone = run(s, { type: 'deleteAudioNote', noteId: s.audioNotes![0].id });
    expect(gone.state.audioNotes).toHaveLength(0);
  });
});

describe('the Documents menu (recentDocs)', () => {
  it('serves the authored list; gated entries are name-only dead shortcuts', () => {
    const s = offlineState();
    const res = run(s, { type: 'recentDocs' }).result;
    expect(res.type).toBe('recentDocs');
    if (res.type !== 'recentDocs') return;
    expect(res.items.length).toBe(SEASON1.recentDocuments!.length);
    expect(res.items.map((i) => i.id)).toEqual(SEASON1.recentDocuments);

    // A reachable file carries its summary (meta included).
    const datebook = res.items.find((i) => i.id === 'file.datebook-1997')!;
    expect(datebook.meta?.modifiedAt).toBeTruthy();

    // Gated files still show their (innocuous) names — dead shortcuts —
    // but nothing else: no meta, no location.
    const ledger = res.items.find((i) => i.id === 'file.ledger-copy')!;
    expect(ledger.name).toBe('wv history extra notes.txt');
    expect(ledger.meta).toBeUndefined();
    expect(ledger.parentId).toBeUndefined();

    // And opening one goes through gating like everywhere else.
    const open = run(s, { type: 'open', itemId: 'file.ledger-copy' }).result;
    expect(open).toMatchObject({ type: 'open', ok: false });
  });

  it('is frozen: player activity never changes the list', () => {
    let s = offlineState();
    const before = run(s, { type: 'recentDocs' }).result;
    s = run(s, { type: 'open', itemId: 'file.algebra' }).state;
    s = run(s, { type: 'open', itemId: 'file.lists' }).state;
    const after = run(s, { type: 'recentDocs' }).result;
    if (before.type !== 'recentDocs' || after.type !== 'recentDocs') throw new Error('bad type');
    expect(after.items.map((i) => i.id)).toEqual(before.items.map((i) => i.id));
  });
});

describe('locked-ancestor sealing', () => {
  // Season 1 has no locked folders yet, so this uses a tiny synthetic
  // season: a Recent-style shortcut must not open a file inside a locked
  // folder (Explorer never hands out such ids, but shortcuts can).
  const TINY: typeof SEASON1 = {
    slug: 'tiny',
    title: 'tiny',
    clock: { now: '1997-10-18T21:00:00' },
    computer: { owner: 'x', loginUser: 'x', loginTargetId: 'login.x' },
    passwords: { 'login.x': { password: 'pw' }, 'folder.safe': { password: 'open sesame' } },
    wallpaper: '',
    homeUrl: '',
    items: [
      { id: 'folder.safe', kind: 'folder', name: 'safe', password: 'open sesame' },
      { id: 'file.inside', kind: 'document', name: 'inside.txt', parentId: 'folder.safe', body: { text: 'hi' } },
    ],
    discoveries: [],
    buddies: [],
    maxPasswordAttempts: 5,
    lockoutSeconds: 60,
  };

  it('open refuses a file whose ancestor folder is still locked', () => {
    let s = newPlayerState();
    s = handleAction(TINY, s, { type: 'login', password: 'pw' }, NOW).state;
    const refused = handleAction(TINY, s, { type: 'open', itemId: 'file.inside' }, NOW).result;
    expect(refused).toMatchObject({ type: 'open', ok: false, error: 'locked' });

    const unlock = handleAction(
      TINY, s, { type: 'attemptPassword', targetId: 'folder.safe', password: 'open sesame' }, NOW,
    );
    s = unlock.state;
    const opened = handleAction(TINY, s, { type: 'open', itemId: 'file.inside' }, NOW).result;
    expect(opened).toMatchObject({ type: 'open', ok: true });
  });
});
