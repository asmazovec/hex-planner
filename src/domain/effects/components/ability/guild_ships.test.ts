import { describe, expect, test } from 'vitest';
import type { Act } from '../../../types';
import type { Player } from '../../../players';
import { adjust, bench, effect, expectNone, expectStanding, expectWaived, FAR, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './guild_ships';

const RIVAL: Player = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const deal = (): Act => ({ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} });
/** My carrier flies next to home and I trade with the rival, whose carrier stands at `rivalAt`. */
const table = (faction: string, acts: Act[] = [deal()], rivalAt = FAR) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts });
  return { move, ...bench({ faction, units: { [HOME]: { carrier: 1 } }, entries: [adjust({ tradeGoods: 2 }), move], game: { opponents: [RIVAL], enemyUnits: { [rivalAt]: { o1: { carrier: 1 } } } } }) };
};

describe('ability:guild_ships Guild Ships', () => {
  // "You can negotiate transactions with players who are not your neighbor."
  // Checks: the Hacan trades with a player two systems away; the warning is listed and lifted by the ability.
  // Why the check is redundant here: 94.1 allows transactions with neighbours only, and the ability removes the
  // condition for the Hacan.
  test('ability:guild_ships lets the Hacan trade with a player who is not a neighbour: the warning is waived', () => {
    const hacan = table('hacan');
    quote(hacan.pack, id, 'You can negotiate transactions with players who are not your neighbor.');
    expectWaived(warningsOf(hacan, hacan.move), 'notNeighbor', id);
  });

  // LRR 94.1: "During the active player's turn, they may resolve up to one transaction with each of their neighbors."
  // Checks: another faction's same transaction is warned of.
  // Why the check is NOT redundant here: the ability is printed on the Hacan sheet only.
  test('ability:guild_ships is the Hacan\'s own: another faction\'s transaction with a stranger stands', () => {
    const sol = table('sol');
    expectStanding(warningsOf(sol, sol.move), 'notNeighbor');
  });

  // Ruling (Hacan, Guild Ships 3): "The Hacan player is still limited to one transaction with every other player per turn."
  // Checks: two transactions with the same player in one turn stay warned of.
  // Why the check is NOT redundant here: the ability lifts who may trade, not how often.
  test('ability:guild_ships does not lift the one transaction per player and turn', () => {
    const hacan = table('hacan', [deal(), deal()]);
    expectStanding(warningsOf(hacan, hacan.move), 'transactionRepeated');
  });

  // Checks: with a neighbour nothing is warned of, so nothing is waived.
  test('ability:guild_ships a transaction with a neighbour makes no warning', () => {
    const hacan = table('hacan', [deal()], TARGET);
    expectNone(warningsOf(hacan, hacan.move), 'notNeighbor');
  });

  test('ability:guild_ships is a passive effect that waives the neighbour check', () => {
    const { pack } = table('hacan');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['notNeighbor']);
  });
});

describe('ability:guild_ships with the Hacan on the other side', () => {
  // Ruling (Hacan, Guild Ships 2): either player may initiate negotiations, so the Hacan's partner may trade with them too.
  // Checks: a Sol player trades with the Hacan two systems away; the warning is listed and lifted by the Hacan's ability.
  // Why the check is NOT redundant for a neighbour: only the distance is lifted (the test above).
  test('ability:guild_ships lifts the neighbour warning of a non-Hacan who trades with the Hacan', () => {
    const hacan: Player = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [deal()] });
    const sol = bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: [adjust({ tradeGoods: 2 }), move], game: { opponents: [hacan], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });
    expectWaived(warningsOf(sol, move), 'notNeighbor', id);
  });
});
