/** The queries that ask the rules, over the rules test board: the answer is the one the old replay gives for the same board. */
import { describe, expect, test } from 'vitest';
import { HOME, NEAR, rulesGame, rulesPack, tech } from '../domain/rules/kit';
import { applyAll } from './apply';
import { emptyBoard } from './board';
import { tableOf } from './fromLegacy';
import {
  capacityIn, costOf, fleetIn, fleetLimit, planetValue, productionLimit, readyPlanets, reinforcementsOf, tokensOnMap, upgradesOf,
} from './queries';

const pack = rulesPack();
const game = rulesGame();
const table = tableOf(game);
const [me] = table.players.map(p => p.id);
const board = applyAll(emptyBoard(table), [
  { type: 'TokensChanged', player: me, delta: { tactic: 3, fleet: 3, strategy: 2 } },
  { type: 'PlanetGained', player: me, planet: 'h1' },
  { type: 'PlanetGained', player: me, planet: 'h2' },
  { type: 'PlanetExhausted', player: me, planet: 'h2' },
  { type: 'StructurePlaced', player: me, at: { planet: 'h1' }, structures: { spacedock: 1 } },
  { type: 'UnitsPlaced', player: me, at: { slot: HOME }, units: { carrier: 1, destroyer: 2, fighter: 5, infantry: 4 } },
  { type: 'SystemActivated', player: me, system: NEAR },
  { type: 'SystemActivated', player: me, system: HOME },
  { type: 'CardGained', player: me, card: tech('carrier') },
]);

describe('what a player has in a system', () => {
  test('capacityIn: the load of fighters and ground forces against the ships\' capacity, four infantry and the two fighters the dock does not keep, against Carrier II', () => {
    expect(capacityIn(table, board, pack, me, HOME)).toEqual({ load: 6, capacity: 6 });
  });

  test('fleetIn counts ships and the fighters the capacity cannot hold; fleetLimit is the pool', () => {
    expect(fleetIn(table, board, pack, me, HOME)).toBe(3);
    expect(fleetLimit(table, board, pack, me)).toBe(3);
  });

  test('productionLimit: the dock\'s planet resources plus its own value', () => {
    expect(productionLimit(table, board, pack, me, HOME)).toBe(3 + 2);
    expect(productionLimit(table, board, pack, me, NEAR)).toBe(0);
  });

  test('costOf: each unit at its cost, two fighters or infantry for one resource', () => {
    expect(costOf(table, board, pack, me, { cruiser: 1, fighter: 2 })).toBe(2 + 1);
  });

  test('planetValue and readyPlanets: an exhausted planet is held but does not pay', () => {
    expect(planetValue(table, board, pack, me, 'h1', 'resources')).toBe(3);
    expect(planetValue(table, board, pack, me, 'h2', 'influence')).toBe(2);
    expect(readyPlanets(board, me)).toEqual(['h1']);
  });
});

describe('what a player holds against the limits', () => {
  test('reinforcementsOf: the limit less what stands on the board; fighters and infantry are tokens', () => {
    const left = reinforcementsOf(board, pack, me);
    expect(left.carrier).toBe((pack.units.carrier?.limit ?? 0) - 1);
    expect(left.destroyer).toBe((pack.units.destroyer?.limit ?? 0) - 2);
    expect(left).not.toHaveProperty('infantry');
    expect(left).not.toHaveProperty('fighter');
  });

  test('tokensOnMap lists the systems with the player\'s token, sorted', () => {
    expect(tokensOnMap(board, me)).toEqual([HOME, NEAR]);
  });

  test('upgradesOf: the technologies that improve a unit', () => {
    expect(upgradesOf(board, pack, me)).toEqual(['carrier']);
    expect(upgradesOf(emptyBoard(table), pack, me)).toEqual([]);
  });
});
