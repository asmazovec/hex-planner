import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, HOME, NEAR, primary, quote, tactical, using } from '../kit';
import { id } from './ms1';

/** A tactical action after which the frontier token of the active system is explored and turns up Merchant Station. */
const explore = (choice?: string): Entry => {
  const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id);
  return (choice ? { ...move, choices: { merchantStation: choice } } : move) as Entry;
};
/** The Federation of Sol (commodity value 4) with a Trade primary first when `trade`, so that there are commodities to convert. */
const sol = (move: Entry, trade = false) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: trade ? [primary(5), move] : [move] });

describe('exploration:ms1 Merchant Station', () => {
  // "You may replenish your commodities, or you may convert your commodities to trade goods."
  // Checks: the explore names the card and chooses to replenish; the commodities are filled up to the faction's value.
  // Why this is automated: the plan counts commodities (21.3), and the card changes them by itself; a check stands
  // as it was, nothing is waived.
  test.fails('exploration:ms1 replenishes the commodities up to the faction value', () => {
    const table = sol(explore('replenish'));
    quote(table.pack, id, 'You may replenish your commodities, or you may convert your commodities to trade goods.');
    expect(endOf(table).commodities).toBe(table.pack.factions.sol.commodities);
  });

  // "... or you may convert your commodities to trade goods."
  // Checks: after Trade filled the commodities, the explore converts every one of them into a trade good.
  // Why this is automated: converting commodities (21.4) is a change of the two counts the plan keeps.
  test.fails('exploration:ms1 converts every commodity into a trade good', () => {
    const table = sol(explore('convert'), true);
    const without = endOf(sol(explore(), true));
    const end = endOf(table);
    expect(without.commodities).toBeGreaterThan(0);
    expect(end.commodities).toBe(0);
    expect(end.tradeGoods).toBe(without.tradeGoods + without.commodities);
  });

  // Checks: named without a choice, the card changes nothing: both of its branches are "may".
  // Why the counts are NOT changed here: the player did not choose either branch.
  test('exploration:ms1 named with no choice changes nothing', () => {
    const table = sol(explore());
    expect(endOf(table).commodities).toBe(0);
    expect(endOf(table).tradeGoods).toBe(0);
  });

  // LRR 21.3: commodities are replenished by effects that say so, such as the Trade strategy card.
  // Checks: a tactical action that does not name the card leaves the commodities empty.
  // Why the count is NOT changed here: nothing replenished them.
  test('exploration:ms1 not explored, the commodities stay as they were', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
    expect(endOf(sol(move)).commodities).toBe(0);
  });

  test.fails('exploration:ms1 is a play effect', () => {
    const { pack } = sol(explore());
    expect(effect(pack, id).tier).toBe('play');
  });
});
