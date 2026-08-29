/**
 * Anti-cheat guarantees: the engine (the only thing that talks to clients)
 * must never return locked content, requirements, passwords, or effects.
 */
import { describe, expect, it } from 'vitest';
import { handleAction } from '@gamecore/engine.ts';
import { newPlayerState, type GameAction, type PlayerState } from '@gamecore/types.ts';
import { SEASON1 } from '@gamecore/season1.ts';

const NOW = 1_000_000;

function run(state: PlayerState, action: GameAction) {
  return handleAction(SEASON1, state, action, NOW);
}

function loggedInState(): PlayerState {
  return run(newPlayerState(), { type: 'login', password: 'sunflower97' }).state;
}

describe('locked content is never returned', () => {
  it('NEW PLAYER requesting the final clue is denied', () => {
    const s = loggedInState();
    const { result } = run(s, { type: 'open', itemId: 'file.oct-pages' });
    expect(result).toMatchObject({ type: 'open', ok: false });
    if (result.type !== 'open') throw new Error('bad result');
    expect(result.item).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('GhostBridge');
  });

  it('player who completed prerequisites gets the final clue', () => {
    let s = loggedInState();
    s = run(s, { type: 'open', itemId: 'email.dana.please-write-back' }).state;
    s = run(s, { type: 'open', itemId: 'im.ghostbridge' }).state;
    const { result } = run(s, { type: 'open', itemId: 'file.oct-pages' });
    expect(result).toMatchObject({ type: 'open', ok: true });
    if (result.type !== 'open' || !result.item) throw new Error('bad result');
    expect(result.item.body?.text).toContain('unless somehow it isn');
  });

  it('folder listings omit items whose requirements are unmet', () => {
    const s = loggedInState();
    const { result } = run(s, { type: 'listChildren', parentId: 'folder.personal' });
    if (result.type !== 'children') throw new Error('bad result');
    expect(result.items.map((i) => i.id)).not.toContain('file.oct-pages');
  });

  it('gated web pages 404 until their requirement is met', () => {
    let s = loggedInState();
    const before = run(s, { type: 'visit', url: 'www.mapfinder.net/maps/miller-point' });
    expect(before.result).toMatchObject({ type: 'visit', ok: false });

    s = run(s, { type: 'open', itemId: 'email.dana.please-write-back' }).state;
    const after = run(s, { type: 'visit', url: 'www.mapfinder.net/maps/miller-point' });
    expect(after.result).toMatchObject({ type: 'visit', ok: true });
  });

  it('search results exclude pages the player cannot reach yet', () => {
    let s = loggedInState();
    let res = run(s, { type: 'search', query: 'overlook' }).result;
    if (res.type !== 'search') throw new Error('bad result');
    expect(res.results.map((r) => r.url)).not.toContain('www.mapfinder.net/maps/miller-point');

    s = run(s, { type: 'open', itemId: 'email.dana.please-write-back' }).state;
    res = run(s, { type: 'search', query: 'overlook' }).result;
    if (res.type !== 'search') throw new Error('bad result');
    expect(res.results.map((r) => r.url)).toContain('www.mapfinder.net/maps/miller-point');
  });

  it('an item is inaccessible when an ANCESTOR folder is gated, even if the item is not', () => {
    // Synthetic content: unlocked file inside a locked folder.
    const content = structuredClone(SEASON1);
    content.items.push(
      {
        id: 'folder.gated',
        kind: 'folder',
        name: 'gated',
        requires: { discovery: 'overlook-plan' },
      },
      { id: 'file.inside-gated', kind: 'document', name: 'x.txt', parentId: 'folder.gated', body: { text: 'secret' } },
    );
    const s = loggedInState();
    const { result } = handleAction(content, s, { type: 'open', itemId: 'file.inside-gated' }, NOW);
    expect(result).toMatchObject({ type: 'open', ok: false });
  });
});

describe('DTO redaction', () => {
  it('never leaks requires / password / onOpen / searchText in any listing or open', () => {
    // Play the entire demo and snapshot every payload the client would see.
    let s = loggedInState();
    const payloads: unknown[] = [];
    const record = (action: GameAction) => {
      const out = run(s, action);
      s = out.state;
      payloads.push(out.result);
    };

    record({ type: 'getState' });
    record({ type: 'getDesktop' });
    for (const folder of ['folder.c', 'folder.my-documents', 'folder.personal', 'folder.recycle']) {
      record({ type: 'listChildren', parentId: folder });
    }
    record({ type: 'open', itemId: 'email.dana.please-write-back' });
    record({ type: 'open', itemId: 'im.ghostbridge' });
    record({ type: 'open', itemId: 'file.oct-pages' });
    record({ type: 'getBuddies' });
    record({ type: 'visit', url: 'www.mapleglenledger.net' });
    record({ type: 'search', query: 'maple glen' });

    const flat = JSON.stringify(payloads);
    expect(flat).not.toContain('"requires"');
    expect(flat).not.toContain('"password"');
    expect(flat).not.toContain('"onOpen"');
    expect(flat).not.toContain('"searchText"');
    expect(flat).not.toContain('sunflower97');
  });

  it('getState exposes only earned discoveries', () => {
    const s = loggedInState();
    const res = run(s, { type: 'getState' }).result;
    if (res.type !== 'state') throw new Error('bad result');
    expect(res.view.discoveries).toHaveLength(0);
    // Notably: no discovery catalog, no titles of future discoveries.
    expect(JSON.stringify(res)).not.toContain('third-screen-name');
  });
});

describe('password guessing', () => {
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
      targetId: 'file.oct-pages', // real item, but has no password
      password: 'whatever',
    });
    expect(result).toMatchObject({ type: 'password', ok: false });
  });
});
