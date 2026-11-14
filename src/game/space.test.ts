/** The map as the kernel asks it, against the old code that counts it: there is one implementation, so the two must give one answer. */
import { describe, expect, test } from 'vitest';
import { adjacentTo, routeReach } from '../domain/movement';
import { FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, TARGET } from '../domain/rules/kit';
import { applyAll } from './apply';
import { emptyBoard } from './board';
import { legacyGame } from '../testing/old/game/legacyViews';
import { tableOf } from '../testing/old/game/fromLegacy';
import { adjacentSlots, areJoined, blockersOf, distancesFrom, reach, shipBlockers, slotsOf } from './space';

const pack = rulesPack();
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);
const board = applyAll(emptyBoard(table), [
  { type: 'UnitsPlaced', player: rival, at: { slot: NEAR }, units: { cruiser: 1 } },
  { type: 'UnitsPlaced', player: rival, at: { slot: FAR }, units: { infantry: 2 } },
  { type: 'UnitsPlaced', player: me, at: { slot: HOME }, units: { carrier: 1 } },
]);

describe('adjacency', () => {
  test('the systems one step away are the neighbours across the row', () => {
    expect(adjacentSlots(table, board, NEAR, pack).sort()).toEqual([HOME, TARGET]);
    expect(areJoined(table, board, HOME, TARGET, pack)).toBe(false);
    expect([...distancesFrom(table, board, HOME, pack)]).toContainEqual([FARTHER, 4]);
  });

  test('the old code over the old game answers the same', () => {
    const old = legacyGame(table, board);
    expect(adjacentSlots(table, board, TARGET, pack).sort()).toEqual(adjacentTo(old, TARGET, pack).sort());
    expect(slotsOf(table, board, pack).sort()).toEqual(expect.arrayContaining([HOME, NEAR, TARGET]));
  });
});

describe('blockers', () => {
  test('other players\' ships end a route; ground forces alone and the mover\'s own ships do not', () => {
    expect([...shipBlockers(board, me, pack)]).toEqual([NEAR]);
    expect([...shipBlockers(board, rival, pack)]).toEqual([HOME]);
    expect([...blockersOf(table, board, me, pack)]).toEqual([NEAR]);
  });
});

describe('reach', () => {
  test('a ship cannot pass a system with other players\' ships, and may end its move there only as the active system', () => {
    const blockers = shipBlockers(board, me, pack);
    expect([...reach(table, board, [HOME], 3, TARGET, pack, blockers)]).toEqual([]);
    expect([...reach(table, board, [HOME], 3, NEAR, pack, blockers)]).toEqual([NEAR]);
  });

  test('the old reach over the same map gives the same systems', () => {
    const none = new Set<string>();
    const old = routeReach(legacyGame(table, board), [NEAR], 2, TARGET, pack, none);
    expect([...reach(table, board, [NEAR], 2, TARGET, pack, none)].sort()).toEqual([...old].sort());
  });
});
