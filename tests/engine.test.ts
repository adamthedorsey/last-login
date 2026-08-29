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

  it('reveals the GhostBridge buddy only after stolen-intimacy', () => {
    let s = loggedInState();
    let res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).not.toContain('GhostBridge');

    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    s = run(s, { type: 'open', itemId: 'trash.bl-log' }).state;
    res = run(s, { type: 'getBuddies' }).result;
    if (res.type !== 'buddies') throw new Error('bad result');
    expect(res.buddies.map((b) => b.screenname)).toContain('GhostBridge');
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
    return s;
  }

  it('GhostBridge is unreachable before the finale', () => {
    const s = loggedInState();
    const res = run(s, { type: 'getConversation', screenname: 'GhostBridge' }).result;
    expect(res).toMatchObject({ type: 'chat', ok: false });
  });

  it('he signs on after the finale, and the word makes him sign off for good', () => {
    let s = finishedState();
    let buddies = run(s, { type: 'getBuddies' }).result;
    if (buddies.type !== 'buddies') throw new Error('bad result');
    expect(buddies.buddies.find((b) => b.screenname === 'GhostBridge')?.status).toBe('online');

    const opened = run(s, { type: 'getConversation', screenname: 'GhostBridge' }).result;
    if (opened.type !== 'chat' || !opened.chat) throw new Error('bad result');
    expect(opened.chat.messages[0].text).toContain('up late');

    const sting = run(s, { type: 'say', screenname: 'GhostBridge', promptId: 'junebug' });
    s = sting.state;
    if (sting.result.type !== 'chat' || !sting.result.chat) throw new Error('bad result');
    expect(sting.result.chat.signedOff).toBe(true);
    expect(sting.result.chat.prompts).toHaveLength(0);

    buddies = run(s, { type: 'getBuddies' }).result;
    if (buddies.type !== 'buddies') throw new Error('bad result');
    expect(buddies.buddies.find((b) => b.screenname === 'GhostBridge')?.status).toBe('offline');
    expect(run(s, { type: 'getConversation', screenname: 'GhostBridge' }).result).toMatchObject({
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
