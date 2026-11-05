import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { deleteGame, listGames, loadGame, requestPersistence, saveGame } from './db';
import { exportGame, importGame } from './transfer';
import { sampleGame } from './fixture';

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
