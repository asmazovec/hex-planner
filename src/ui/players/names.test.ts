import type { TFunction } from 'i18next';
import { expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import type { Table } from '../../game/types';
import { opponentsBySeat } from './names';

const pack = loadPack(['pok']);
const t = ((key: string, values?: { n: number }) => (values ? `${key} ${values.n}` : key)) as unknown as TFunction;
const player = (id: string, seat: number, faction: string, color: number, legacyId?: string) => ({ id, seat, faction, color, setup: {}, ...(legacyId ? { legacyId } : {}) });
const table = {
  id: 'g', name: '', expansions: ['pok'], layout: 'normal', map: {}, viewer: 'p1',
  players: [player('p1', 1, 'sol', 1), player('p3', 3, '', 3, 'b'), player('p2', 2, 'hacan', 2, 'a')],
} as unknown as Table;

test('an opponent goes by faction, or by player number without one; they are listed by seat under the key the screens know', () => {
  const list = opponentsBySeat(table, pack, t);
  expect(list.map(o => o.id)).toEqual(['a', 'b']);
  expect(list.map(o => o.name)).toEqual([pack.factions.hacan.name, 'players.player 2']);
  expect(list.map(o => [o.seat, o.color])).toEqual([[2, 2], [3, 3]]);
});
