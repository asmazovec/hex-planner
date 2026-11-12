import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, FAR, NEAR, quote, TARGET, tactical, warningsOf, type Bench } from '../kit';
import { id } from './lf1';

/** A carrier from the next system lands one infantry on Target One and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** The wanted shape (pass 2): what the player chose for the card, in the entry's `choices` under the card's id. */
const choosing = (entry: Entry, choice: 'gain' | 'place-tradeGood' | 'place-commodity'): Entry => ({ ...entry, choices: { [id]: choice } } as Entry);
const table = (entries: Entry[], more: Record<string, UnitCounts> = {}): Bench =>
  bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 }, ...more }, entries });

describe('exploration:lf1 Local Fabricators', () => {
  // "You may gain 1 commodity"
  // Checks: the card explored with Target One gives one commodity.
  // Why the check is redundant here: nothing is lifted; the plan counts the commodities.
  test.fails('exploration:lf1 gains one commodity', () => {
    const fabricators = table([choosing(landing([id]), 'gain')]);
    quote(fabricators.pack, id, 'You may gain 1 commodity');
    expect(endOf(fabricators).commodities).toBe(1);
  });

  // "... or you may spend 1 trade good or 1 commodity to place 1 mech from your reinforcements on this planet."
  // Checks: with one trade good the player spends it and a mech stands on Target One beside the infantry.
  // Why the check is redundant here: nothing is lifted; units are otherwise placed by production (67), and the card
  // names its own way, so the plan places the mech.
  test.fails('exploration:lf1 spends a trade good to place a mech on the planet', () => {
    const fabricators = table([adjust({ tradeGoods: 1 }), choosing(landing([id]), 'place-tradeGood')]);
    quote(fabricators.pack, id, 'to place 1 mech from your reinforcements on this planet');
    expect(endOf(fabricators).tradeGoods).toBe(0);
    expect(endOf(fabricators).ground.t1).toEqual({ infantry: 1, mech: 1 });
  });

  // "... place 1 mech from your reinforcements"
  // Checks: with all four mechs on the board the placement is warned of, as production beyond the pieces is.
  // Why the check is NOT redundant here: the card takes the mech from reinforcements, and none is left; the card's
  // note lets the player take one from a system without their command token instead, which the plan leaves to them.
  test.fails('exploration:lf1 with no mech left in reinforcements the placement is warned of', () => {
    const entry = choosing(landing([id]), 'place-tradeGood');
    const fabricators = table([adjust({ tradeGoods: 1 }), entry], { [FAR]: { mech: 4 } });
    expectStanding(warningsOf(fabricators, entry), 'reinforcementsOut');
  });

  // LRR 26 / 93: a player spends only the trade goods they have.
  // Checks: with no trade good the placement is warned of.
  // Why the check is NOT redundant here: the card asks for a trade good spent, and there is none.
  test.fails('exploration:lf1 placing with no trade good is warned of', () => {
    const entry = choosing(landing([id]), 'place-tradeGood');
    expectStanding(warningsOf(table([entry]), entry), 'shortTradeGoods');
  });

  // Checks: the landing without the card leaves the infantry alone on Target One.
  // Why nothing is validated here: no card was explored.
  test('exploration:lf1 not explored, no mech appears on the planet', () => {
    expect(endOf(table([adjust({ tradeGoods: 1 }), landing()])).ground.t1).toEqual({ infantry: 1 });
  });

  test.fails('exploration:lf1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
