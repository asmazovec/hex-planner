import type { TFunction } from 'i18next';
import { expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import type { Table } from '../../game/types';
import { othersBySeat } from './names';

const pack = loadPack(['pok']);
const t = ((key: string, values?: { n: number }) => (values ? `${key} ${values.n}` : key)) as unknown as TFunction;
const player = (id: string, seat: number, faction: string, color: number) => ({ id, seat, faction, color, setup: {} });
const table = {
  id: 'g', name: '', expansions: ['pok'], layout: 'normal', map: {}, viewer: 'p1',
  players: [player('p1', 1, 'sol', 1), player('p3', 3, '', 3), player('p2', 2, 'hacan', 2)],
} as unknown as Table;

test('the players beside one go by faction, or by player number (the seat) without one; they are listed by seat under their player id', () => {
  const list = othersBySeat(table, 'p1', pack, t);
  expect(list.map(o => o.id)).toEqual(['p2', 'p3']);
  expect(list.map(o => o.name)).toEqual([pack.factions.hacan.name, 'players.player 3']);
  expect(list.map(o => [o.seat, o.color])).toEqual([[2, 2], [3, 3]]);
});
