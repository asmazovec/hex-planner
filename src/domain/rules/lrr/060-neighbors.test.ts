/** LRR 60 Neighbors. Source: tirules2 rules-reference/neighbors.md. My home planets on HOME make me present there. */
import { describe, expect, test } from 'vitest';
import type { Act, Entry } from '../../types';
import type { Player } from '../../players';
import { FAR, FARTHER, HOME, NEAR, TARGET, adjust, codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';
import { areNeighbors } from '../../../testing/old/domain/neighbors';

/** The rival's faction has an empty home tile off this row, so they are only where their carrier is. */
const pack = rulesPack(p => {
  p.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
});
const RIVAL: Player = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };

/** Me with my home, the rival with a carrier where given, and the map row of the kit unless a map is given. */
const withRival = (rivalAt: string, extra: { map?: Record<string, string>; units?: Record<string, Record<string, number>>; entries?: Entry[] } = {}) =>
  rulesGame({ map: extra.map, units: extra.units, entries: extra.entries, game: { opponents: [RIVAL], enemyUnits: { [rivalAt]: { o1: { carrier: 1 } } } } });
const neighbours = (game: ReturnType<typeof rulesGame>) => {
  const { state } = forecast(game, pack);
  return areNeighbors(game, state, state.rivals!.o1, pack);
};

describe('LRR 60 Neighbors', () => {
  test('60: a unit of each in the same system makes neighbours', () => {
    expect(neighbours(withRival(HOME))).toBe(true);
  });

  test('60: units in adjacent systems make neighbours', () => {
    expect(neighbours(withRival(NEAR))).toBe(true);
  });

  test('60: players far apart are not neighbours', () => {
    expect(neighbours(withRival(FAR))).toBe(false);
  });

  test('60.1: a transaction with a player who is not a neighbour warns', () => {
    const deal: Act = { kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} };
    const turn = tactical(HOME, { acts: [deal] });
    const game = withRival(FAR, { entries: [adjust({ tradeGoods: 1 }), turn] });
    expect(codesOf(game, pack, turn)).toContain('notNeighbor');
    const near = withRival(NEAR, { entries: [adjust({ tradeGoods: 1 }), turn] });
    expect(codesOf(near, pack, turn)).not.toContain('notNeighbor');
  });

  test('60.2: systems joined by a wormhole make neighbours', () => {
    const map = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-alpha' };
    expect(neighbours(withRival(FARTHER, { map, units: { [NEAR]: { carrier: 1 } } }))).toBe(true);
    const plain = { ...map, [FARTHER]: 'r-empty' };
    expect(neighbours(withRival(FARTHER, { map: plain, units: { [NEAR]: { carrier: 1 } } }))).toBe(false);
  });

  test.todo('60.3: the Ghosts of Creuss are neighbours through Quantum Entanglement — not modelled: faction abilities are manual');
});
