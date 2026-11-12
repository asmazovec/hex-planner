import { describe, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './gw';

const RIVAL = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };

/**
 * The last system of the row holds a printed gamma wormhole (as Mallice does) and the rival's carrier. In round 1 my
 * cruiser flies next door and explores its frontier token; in round 2 I offer the rival a trade good from there.
 */
const table = (explore: Entry, deal: Entry, farther = 'r-gamma') => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, rounds: [[explore], [adjust({ tradeGoods: 1 }), deal]],
  game: {
    map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: farther },
    opponents: [RIVAL], enemyUnits: { [FARTHER]: { o1: { carrier: 1 } } },
  },
  edit: pack => {
    pack.tiles['r-gamma'] = { id: 'r-gamma', number: 'r-gamma', planetIds: [], kind: 'system', wormholes: ['gamma'] };
    pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
  },
});
const explore = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
const deal = () => tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} }] });

describe('exploration:gw Gamma Wormhole', () => {
  // "Place a gamma wormhole token in this system."
  // Checks: the token placed next door joins that system to the gamma wormhole at the end of the row; the rival there
  // is my neighbour, and the transaction is not warned of.
  // Why the check is redundant here: LRR 60.1 lets neighbours trade; systems with identical wormholes are adjacent
  // (101) and so make neighbours (101.3) — the token makes my system one of them.
  test('exploration:gw the token placed makes the player across the gamma wormhole a neighbour', () => {
    const transaction = deal();
    const wormhole = table(using(explore(), id), transaction);
    quote(wormhole.pack, id, 'Place a gamma wormhole token in this system.');
    expectNone(warningsOf(wormhole, transaction), 'notNeighbor');
  });

  // LRR 60.1: "A player can only resolve transactions with their neighbors."
  // Checks: the same flight without the card leaves the rival four systems away; the transaction is warned of.
  // Why the check is NOT redundant here: no wormhole joins the two systems.
  test('exploration:gw without the card the rival is not a neighbour', () => {
    const transaction = deal();
    expectStanding(warningsOf(table(explore(), transaction), transaction), 'notNeighbor');
  });

  // Checks: with no other gamma wormhole on the board, the token joins nothing.
  // Why the check is NOT redundant here: a wormhole is adjacent only to an identical one.
  test('exploration:gw a gamma token with no other gamma wormhole joins nothing', () => {
    const transaction = deal();
    expectStanding(warningsOf(table(using(explore(), id), transaction, 'r-empty'), transaction), 'notNeighbor');
  });

  test.todo('exploration:gw a route through the token is drawn as adjacent, not as a jump: the route graph is static (src/domain/movement.ts) and a jump makes no warning to test');
});
