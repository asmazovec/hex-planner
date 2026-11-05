import { expect, test } from 'vitest';
import { loadPack } from './loadPack';
import { SHIP_SUMMARIES, shipSummary } from './shipSummaries';

const pack = loadPack(['pok', 'te']);
const shipIds = new Set([
  ...Object.values(pack.units).flatMap(def => (def.levels ? [def.levels.one, def.levels.two] : [])),
  ...Object.values(pack.factions).flatMap(f => Object.values(f.ships ?? {}).flatMap(l => [l.one, l.two])),
].flatMap(stat => (stat ? [stat.id] : [])));

test('every retelling belongs to a ship in the packs and has both languages', () => {
  const ids = Object.keys(SHIP_SUMMARIES);
  expect(ids.length).toBeGreaterThan(40);
  for (const id of ids) {
    expect(shipIds.has(id), id).toBe(true);
    expect(shipSummary(id, 'ru'), `${id} ru`).toMatch(/[а-яё]{3}/i);
    expect(shipSummary(id, 'en'), `${id} en`).toMatch(/[a-z]{3}/i);
  }
});

test('a ship without an ability has no retelling', () => {
  expect(shipSummary('carrier', 'ru')).toBeNull();
});
