/**
 * Anti-cheat guarantees: the engine (the only thing that talks to clients)
 * must never return locked content, requirements, passwords, or effects.
 */
import { describe, expect, it } from 'vitest';
import { handleAction } from '@gamecore/engine.ts';
import { newPlayerState, type GameAction, type PlayerState } from '@gamecore/types.ts';
import { SEASON1 } from '@gamecore/season1.ts';

const NOW = 1_000_000;

const CHAIN_OPENS = [
  'email.sadie.please',
  'trash.bl-log',
  'email.sadie.notchad',
  'email.ruth.yourdad',
  'file.ledger-copy',
  'email.rebecca',
  'trash.diary',
];

function run(state: PlayerState, action: GameAction) {
  return handleAction(SEASON1, state, action, NOW);
}

function loggedInState(): PlayerState {
  return run(newPlayerState(), { type: 'login', password: 'sunflower97' }).state;
}

describe('locked content is never returned', () => {
  it('NEW PLAYER requesting the final clue is denied', () => {
    const s = loggedInState();
    const { result } = run(s, { type: 'open', itemId: 'trash.diary' });
    expect(result).toMatchObject({ type: 'open', ok: false });
    if (result.type !== 'open') throw new Error('bad result');
    expect(result.item).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('2:14');
  });

  it('player who completed prerequisites gets the final clue', () => {
    let s = loggedInState();
    for (const id of CHAIN_OPENS.slice(0, -1)) {
      s = run(s, { type: 'open', itemId: id }).state;
    }
    const { result } = run(s, { type: 'open', itemId: 'trash.diary' });
    expect(result).toMatchObject({ type: 'open', ok: true, ended: true });
    if (result.type !== 'open' || !result.item) throw new Error('bad result');
    expect(result.item.body?.text).toContain('2:14 AM');
  });

  it('folder and mailbox listings omit items whose requirements are unmet', () => {
    const s = loggedInState();
    const school = run(s, { type: 'listChildren', parentId: 'folder.school' }).result;
    if (school.type !== 'children') throw new Error('bad result');
    expect(school.items.map((i) => i.id)).not.toContain('file.ledger-copy');

    const bin = run(s, { type: 'listChildren', parentId: 'folder.recycle' }).result;
    if (bin.type !== 'children') throw new Error('bad result');
    expect(bin.items.map((i) => i.id)).not.toContain('trash.bl-log');
    expect(bin.items.map((i) => i.id)).not.toContain('trash.diary');

    const inbox = run(s, { type: 'listChildren', parentId: 'mailbox.inbox' }).result;
    if (inbox.type !== 'children') throw new Error('bad result');
    expect(inbox.items.map((i) => i.id)).not.toContain('email.rebecca');
    expect(inbox.items.map((i) => i.id)).not.toContain('email.ruth.yourdad');
  });

  it('gated web pages 404 until their requirement is met', () => {
    let s = loggedInState();
    const before = run(s, { type: 'visit', url: 'www.mapfinder.net/maps/route9-bend' });
    expect(before.result).toMatchObject({ type: 'visit', ok: false });

    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    const after = run(s, { type: 'visit', url: 'www.mapfinder.net/maps/route9-bend' });
    expect(after.result).toMatchObject({ type: 'visit', ok: true });
  });

  it('search results exclude pages the player cannot reach yet', () => {
    let s = loggedInState();
    let res = run(s, { type: 'search', query: 'mile marker' }).result;
    if (res.type !== 'search') throw new Error('bad result');
    expect(res.results.map((r) => r.url)).not.toContain('www.mapfinder.net/maps/route9-bend');

    s = run(s, { type: 'open', itemId: 'email.sadie.please' }).state;
    res = run(s, { type: 'search', query: 'mile marker' }).result;
    if (res.type !== 'search') throw new Error('bad result');
    expect(res.results.map((r) => r.url)).toContain('www.mapfinder.net/maps/route9-bend');
  });

  it('an item is inaccessible when an ANCESTOR folder is gated, even if the item is not', () => {
    const content = structuredClone(SEASON1);
    content.items.push(
      { id: 'folder.gated', kind: 'folder', name: 'gated', requires: { discovery: 'the-meeting' } },
      { id: 'file.inside-gated', kind: 'document', name: 'x.txt', parentId: 'folder.gated', body: { text: 'secret' } },
    );
    const s = loggedInState();
    const { result } = handleAction(content, s, { type: 'open', itemId: 'file.inside-gated' }, NOW);
    expect(result).toMatchObject({ type: 'open', ok: false });
  });
});

describe('DTO redaction', () => {
  it('never leaks requires / password / onOpen / searchText in any listing or open', () => {
    // Play the entire season and snapshot every payload the client would see.
    let s = loggedInState();
    const payloads: unknown[] = [];
    const record = (action: GameAction) => {
      const out = run(s, action);
      s = out.state;
      payloads.push(out.result);
    };

    record({ type: 'getState' });
    record({ type: 'getDesktop' });
    for (const folder of ['folder.c', 'folder.my-documents', 'folder.school', 'folder.recycle', 'mailbox.inbox']) {
      record({ type: 'listChildren', parentId: folder });
    }
    record({ type: 'getConversation', screenname: 'sadiedraws77' });
    record({ type: 'say', screenname: 'sadiedraws77', promptId: 'intro' });
    for (const id of CHAIN_OPENS) record({ type: 'open', itemId: id });
    record({ type: 'getBuddies' });
    record({ type: 'getConversation', screenname: 'GhostBridge' });
    record({ type: 'say', screenname: 'GhostBridge', promptId: 'junebug' });
    record({ type: 'visit', url: 'www.humbleregister.net' });
    record({ type: 'search', query: 'humble' });
    record({ type: 'getState' });

    const flat = JSON.stringify(payloads);
    expect(flat).not.toContain('"requires"');
    expect(flat).not.toContain('"password"');
    expect(flat).not.toContain('"onOpen"');
    expect(flat).not.toContain('"searchText"');
    expect(flat).not.toContain('"discover"');
    expect(flat).not.toContain('"setFlags"');
    expect(flat).not.toContain('"signOff"'); // signedOff (past tense) is the DTO
    expect(flat).not.toContain('sunflower97');
  });

  it('gated chat branches never leak their text before they are earned', () => {
    let s = loggedInState();
    s = run(s, { type: 'say', screenname: 'sadiedraws77', promptId: 'intro' }).state;
    const res = run(s, { type: 'getConversation', screenname: 'sadiedraws77' }).result;
    const flat = JSON.stringify(res);
    // The vigil branch (who-shaped) requires the-pipeline; the frank branch
    // (the-clean-truck) requires chads-window. Neither may appear yet.
    expect(flat).not.toContain('vigil');
    expect(flat).not.toContain('exactly right');
    expect(flat).not.toContain('washes his car');

    const denied = run(s, { type: 'say', screenname: 'sadiedraws77', promptId: 'vigil' }).result;
    expect(denied).toMatchObject({ type: 'chat', ok: false });
    expect(JSON.stringify(denied)).not.toContain('exactly right');
  });

  it('the epilogue conversation does not exist before the finale', () => {
    const s = loggedInState();
    const res = run(s, { type: 'getConversation', screenname: 'GhostBridge' }).result;
    expect(res).toMatchObject({ type: 'chat', ok: false });
    expect(JSON.stringify(res)).not.toContain('up late');
  });

  it('getState exposes only earned discoveries and no future titles', () => {
    const s = loggedInState();
    const res = run(s, { type: 'getState' }).result;
    if (res.type !== 'state') throw new Error('bad result');
    expect(res.view.discoveries).toHaveLength(0);
    expect(JSON.stringify(res)).not.toContain('the-house');
    expect(JSON.stringify(res)).not.toContain('2:14');
  });

  it('the saver text is view data, not a leak of anything gated', () => {
    const res = run(loggedInState(), { type: 'getState' }).result;
    if (res.type !== 'state') throw new Error('bad result');
    // The word is on her idle screen — the player is entitled to see it.
    expect(res.view.saverText).toBe('junebug');
  });
});

describe('password guessing', () => {
  it('withholds the owner’s hint until it is earned by failing', () => {
    let s = newPlayerState();
    const fresh = run(s, { type: 'getState' }).result;
    expect(JSON.stringify(fresh)).not.toContain('flower');
    for (let i = 0; i < 2; i++) {
      const r = run(s, { type: 'login', password: `x${i}` });
      s = r.state;
      expect(JSON.stringify(r.result)).not.toContain('flower');
    }
  });

  it('cannot brute-force without limit', () => {
    let s = loggedInState();
    for (let i = 0; i < SEASON1.maxPasswordAttempts; i++) {
      s = run(s, { type: 'attemptPassword', targetId: 'login.casey', password: `x${i}` }).state;
    }
    const { result } = run(s, {
      type: 'attemptPassword',
      targetId: 'login.casey',
      password: 'sunflower97',
    });
    expect(result).toMatchObject({ type: 'password', ok: false, lockedOut: true });
  });

  it('unknown targets reveal nothing', () => {
    const s = loggedInState();
    const { result } = run(s, {
      type: 'attemptPassword',
      targetId: 'file.ledger-copy',
      password: 'whatever',
    });
    expect(result).toMatchObject({ type: 'password', ok: false });
  });
});
