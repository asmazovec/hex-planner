import { expect, test } from 'vitest';
import type { ExpansionId } from '../domain/types';
import { loadPack } from './loadPack';
import { techSummary } from './techSummaries';

const COMBINATIONS: ExpansionId[][] = [[], ['pok'], ['te'], ['pok', 'te']];

test('every starting technology of every faction has a retelling in both languages', () => {
  for (const expansions of COMBINATIONS) {
    const pack = loadPack(expansions);
    const ids = Object.values(pack.factions)
      .flatMap(faction => [...faction.startingTech, ...(faction.startingTechChoice?.options ?? [])]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(techSummary(id, 'ru'), `${id} ru`).toMatch(/[а-яё]{3}/i);
      expect(techSummary(id, 'en'), `${id} en`).toMatch(/[a-z]{3}/i);
    }
  }
});

test('an unknown technology has no retelling', () => {
  expect(techSummary('nope', 'ru')).toBeNull();
});
