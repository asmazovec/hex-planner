import { expect, test } from 'vitest';
import { loadPack, strategyCards } from '../data/loadPack';
import { strategyCardSet } from './cards';
import { textOf } from './components';
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

test('у каждой карты есть текст основной и второстепенной способности при любом наборе дополнений', () => {
  for (const set of [[], ['pok'], ['te'], ['pok', 'te']] as ExpansionId[][]) {
    const pack = loadPack(set);
    for (const c of strategyCards(set)) {
      expect(textOf(pack, `strategy:${c.id}`), `${set} ${c.id}`).toMatch(/\w/);
      expect(textOf(pack, `strategy:${c.id}#secondary`), `${set} ${c.id}`).toMatch(/\w/);
    }
  }
});

test('наборы различают версии Diplomacy и Construction', () => {
  const key = (set: ExpansionId[], name: string) => strategyCards(set).find(c => c.name === name)!.id;
  expect(key([], 'Diplomacy')).not.toBe(key(['pok'], 'Diplomacy'));
  expect(key([], 'Construction')).not.toBe(key(['pok'], 'Construction'));
  expect(key(['te'], 'Construction')).not.toBe(key(['pok'], 'Construction'));
  expect(key(['te'], 'Diplomacy')).toBe(key(['pok'], 'Diplomacy'));
});
