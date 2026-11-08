import { expect, test } from 'vitest';
import { strategyCards } from '../data/loadPack';
import { strategyCardSet } from './cards';
import { cardSummary } from '../data/cardSummaries';
import type { ExpansionId } from './types';

test('набор карт зависит от дополнений', () => {
  expect(strategyCardSet([])).toBe('base_game');
  expect(strategyCardSet(['pok'])).toBe('pok');
  expect(strategyCardSet(['pok', 'te'])).toBe('te');
  expect(strategyCardSet(['te'])).toBe('te');
  expect(strategyCards(['te']).filter(c => c.changedIn).map(c => c.name))
    .toEqual(['Construction', 'Warfare']);
});

test('каждый набор содержит восемь карт по порядку инициативы', () => {
  for (const set of [[], ['pok'], ['te']] as ExpansionId[][])
    expect(strategyCards(set).map(c => c.initiative)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
});

test('у каждой карты есть пересказ на обоих языках', () => {
  for (const set of [[], ['pok'], ['te']] as ExpansionId[][])
    for (const c of strategyCards(set))
      expect(cardSummary(c.summaryKey, 'ru').primary && cardSummary(c.summaryKey, 'en').secondary).toBeTruthy();
});

test('наборы различают версии Diplomacy и Construction', () => {
  const key = (set: ExpansionId[], name: string) => strategyCards(set).find(c => c.name === name)!.summaryKey;
  expect(key([], 'Diplomacy')).not.toBe(key(['pok'], 'Diplomacy'));
  expect(key([], 'Construction')).not.toBe(key(['pok'], 'Construction'));
  expect(key(['te'], 'Construction')).not.toBe(key(['pok'], 'Construction'));
  expect(key(['te'], 'Diplomacy')).toBe(key(['pok'], 'Diplomacy'));
});

test("текст изменения есть только у карт, изменённых в Thunder's Edge", () => {
  for (const c of strategyCards(['te'])) {
    for (const lang of ['ru', 'en'] as const) {
      const { change } = cardSummary(c.summaryKey, lang);
      if (c.changedIn) expect(change).toBeTruthy();
      else expect(change).toBeUndefined();
    }
  }
});
