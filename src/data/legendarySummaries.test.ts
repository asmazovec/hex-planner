import { expect, test } from 'vitest';
import type { ExpansionId } from '../domain/types';
import { legendarySummary } from './legendarySummaries';
import { loadPack } from './loadPack';

const COMBINATIONS: ExpansionId[][] = [[], ['pok'], ['te'], ['pok', 'te']];

test('every legendary planet of every pack has a retelling in both languages, and there are 16 planets', () => {
  const all = new Set<string>();
  for (const expansions of COMBINATIONS) {
    for (const planet of Object.values(loadPack(expansions).planets)) {
      if (!planet.legendary) continue;
      all.add(planet.id);
      expect(legendarySummary(planet.legendary, 'ru'), `${planet.id} ru`).toMatch(/[а-яё]{3}/i);
      expect(legendarySummary(planet.legendary, 'en'), `${planet.id} en`).toMatch(/[a-z]{3}/i);
    }
  }
  expect(all.size).toBe(16);
});

test('an unknown ability has no retelling', () => {
  expect(legendarySummary('nope', 'en')).toBeNull();
});
