import type { TFunction } from 'i18next';
import { expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { opponentName } from './names';

const pack = loadPack(['pok']);
const t = ((key: string, values?: { n: number }) => (values ? `${key} ${values.n}` : key)) as unknown as TFunction;
const game = { opponents: [{ id: 'a', faction: 'sol', vp: 0, seat: 2, color: 2 }, { id: 'b', faction: '', vp: 0, seat: 3, color: 3 }] };

test('an opponent goes by faction, or by player number without one', () => {
  expect(opponentName(game, pack, 'a', t)).toBe(pack.factions.sol.name);
  expect(opponentName(game, pack, 'b', t)).toBe('players.player 3');
});

test('an unknown id is no player number', () => {
  expect(opponentName(game, pack, 'gone', t)).toBe('players.opponent');
});
