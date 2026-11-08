import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrokenSaveError, deleteGame, listGames, loadGame, loadRawGame, requestPersistence, saveGame } from './db';
import type { Game } from '../domain/types';
import { CURRENT_SCHEMA, exportGame, importGame } from './transfer';
import { brokenSave, gameOfSchema1, putRawSave, sampleGame } from './fixture';

beforeEach(async () => {
  for (const g of await listGames()) await deleteGame(g.id);
});

test('сохранение и загрузка', async () => {
  const game = sampleGame();
  await saveGame(game);
  expect(await loadGame(game.id)).toEqual(game);
  expect(await loadGame('missing')).toBeNull();
});

test('список партий и удаление', async () => {
  const a = sampleGame();
  const b = { ...sampleGame(), id: 'other', playerCount: 6 };
  await saveGame(a);
  await saveGame(b);
  const list = await listGames();
  expect(list.map(g => g.id).sort()).toEqual([a.id, 'other'].sort());
  expect(list.find(g => g.id === 'other')).toMatchObject({ faction: b.faction, playerCount: 6 });
  expect(typeof list[0].updatedAt).toBe('number');
  await deleteGame(a.id);
  expect((await listGames()).map(g => g.id)).toEqual(['other']);
});

test('повторное сохранение заменяет партию', async () => {
  const game = sampleGame();
  await saveGame(game);
  await saveGame({ ...game, activePlanId: 'x' });
  expect((await loadGame(game.id))?.activePlanId).toBe('x');
  expect(await listGames()).toHaveLength(1);
});

test('неудачный импорт не меняет сохранённые партии', async () => {
  await saveGame(sampleGame());
  const before = await listGames();
  expect(importGame('{oops').ok).toBe(false);
  expect(importGame(exportGame({ ...sampleGame(), schemaVersion: 99 })).ok).toBe(false);
  expect(await listGames()).toEqual(before);
});

test('requestPersistence без поддержки возвращает false', async () => {
  expect(await requestPersistence()).toBe(false);
});

afterEach(() => {
  vi.doUnmock('idb');
  vi.resetModules();
});

/** Loads a fresh db module whose openDB is wrapped: it counts calls, may fail the first, and exposes `terminated`. */
async function freshDb(failFirst: boolean) {
  vi.resetModules();
  const real = await vi.importActual<typeof import('idb')>('idb');
  const spy = { calls: 0, terminated: undefined as (() => void) | undefined };
  vi.doMock('idb', () => ({
    openDB: (...args: Parameters<typeof real.openDB>) => {
      spy.calls += 1;
      spy.terminated = args[2]?.terminated;
      return failFirst && spy.calls === 1 ? Promise.reject(new Error('open failed')) : real.openDB(...args);
    },
  }));
  return { fresh: await import('./db'), spy };
}

test('сбой открытия базы не ломает следующие сохранения', async () => {
  const { fresh } = await freshDb(true);
  const game = sampleGame();
  await expect(fresh.saveGame(game)).rejects.toThrow('open failed');
  await fresh.saveGame(game);
  expect(await fresh.loadGame(game.id)).toEqual(game);
});

test('после закрытия соединения браузером база открывается заново', async () => {
  const { fresh, spy } = await freshDb(false);
  const game = sampleGame();
  await fresh.saveGame(game);
  await fresh.saveGame(game);
  expect(spy.calls).toBe(1);
  spy.terminated?.();
  await fresh.saveGame(game);
  expect(spy.calls).toBe(2);
  expect(await fresh.loadGame(game.id)).toEqual(game);
});

test('a game saved before seats opens with seats in list order', async () => {
  const v1 = gameOfSchema1();
  const old: Record<string, unknown> = { ...v1, id: 'before-seats', opponents: (v1.opponents as { faction: string; vp: number }[]).map(({ faction, vp }) => ({ faction, vp })) };
  for (const field of ['seat', 'color', 'vp']) delete old[field];
  await saveGame(old as unknown as Game);
  const loaded = await loadGame('before-seats');
  expect([loaded!.seat, loaded!.color, loaded!.vp]).toEqual([1, 1, 0]);
  expect(loaded!.opponents.map(o => o.seat)).toEqual([2, 3, 4]);
  await deleteGame('before-seats');
});

test('a game saved at schema 1 opens with owners: its units and enemy planets belong to the first opponent', async () => {
  await saveGame({ ...gameOfSchema1(), id: 'before-owners' } as unknown as Game);
  const first = await loadGame('before-owners');
  const again = await loadGame('before-owners');
  expect(first!.schemaVersion).toBe(CURRENT_SCHEMA);
  const id = first!.opponents[0].id;
  expect(first!.enemyUnits).toEqual({ '1,0': { [id]: { dreadnought: 2 } }, '0,1': { [id]: { fighter: 3 } } });
  expect(first!.planetOwner).toEqual({ arc: id, lazar: id });
  expect(again!.opponents.map(o => o.id)).toEqual(first!.opponents.map(o => o.id));
  await deleteGame('before-owners');
});

test('a game saved at the current schema opens unchanged, owners included', async () => {
  const game = sampleGame();
  const owned = { ...game, planetControl: { arc: 'enemy' as const }, planetOwner: { arc: game.opponents[2].id } };
  await saveGame(owned);
  expect(await loadGame(game.id)).toEqual(owned);
  await deleteGame(game.id);
});

describe('a save that does not load', () => {
  test('it is listed as broken beside the good ones, never dropped, and goes only when deleted', async () => {
    const good = sampleGame();
    await saveGame(good);
    await putRawSave(brokenSave());
    const list = await listGames();
    expect(list.find(g => g.id === good.id)?.broken).toBeUndefined();
    expect(list.find(g => g.id === 'broken')).toMatchObject({ name: 'Damaged', faction: 'sol', broken: true });
    await expect(loadGame('broken')).rejects.toBeInstanceOf(BrokenSaveError);
    await expect(loadGame('broken')).rejects.toThrow(/plans/);
    expect(await loadGame(good.id)).toEqual(good);
    expect((await listGames()).map(g => g.id)).toContain('broken');
    await deleteGame('broken');
    expect((await listGames()).map(g => g.id)).toEqual([good.id]);
  });

  test('its raw data can still be read for a file copy', async () => {
    const record = brokenSave();
    await putRawSave(record);
    expect(await loadRawGame('broken')).toEqual(record);
    expect(await loadRawGame('missing')).toBeUndefined();
  });

  test('a save with no game, no summary, or a game a migration chokes on is broken, not a crash', async () => {
    await putRawSave({ id: 'empty' });
    await putRawSave({ id: 'odd', name: 42, game: 'text' });
    // An opponent that is no object makes the seat migration throw.
    await putRawSave({ id: 'chokes', game: { ...gameOfSchema1(), id: 'chokes', opponents: [null] } });
    const list = await listGames();
    for (const id of ['empty', 'odd', 'chokes']) {
      expect(list.find(g => g.id === id)).toMatchObject({ id, faction: '', playerCount: 0, broken: true });
      await expect(loadGame(id)).rejects.toBeInstanceOf(BrokenSaveError);
    }
    expect(list.find(g => g.id === 'odd')?.name).toBeUndefined();
  });

  test('a save the database fails to read is listed as broken, and the others still are listed', async () => {
    const good = sampleGame();
    await saveGame(good);
    await putRawSave(brokenSave('unreadable'));
    const real = IDBObjectStore.prototype.get;
    const spy = vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (this: IDBObjectStore, key) {
      if (key === 'unreadable') throw new DOMException('read failed', 'UnknownError');
      return real.call(this, key);
    });
    try {
      const list = await listGames();
      expect(list.find(g => g.id === 'unreadable')).toMatchObject({ broken: true });
      expect(list.find(g => g.id === good.id)?.broken).toBeUndefined();
      await expect(loadGame('unreadable')).rejects.toThrow(BrokenSaveError);
    } finally {
      spy.mockRestore();
    }
  });
});

test('without IndexedDB every call fails as a promise the caller can catch, nothing throws on import', async () => {
  vi.resetModules();
  vi.stubGlobal('indexedDB', undefined);
  try {
    const fresh = await import('./db');
    await expect(fresh.listGames()).rejects.toThrow();
    await expect(fresh.loadGame('x')).rejects.toThrow();
    await expect(fresh.saveGame(sampleGame())).rejects.toThrow();
    await expect(fresh.deleteGame('x')).rejects.toThrow();
  } finally {
    vi.unstubAllGlobals();
  }
});
