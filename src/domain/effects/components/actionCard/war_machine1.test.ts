import { describe, expect, test } from 'vitest';
import type { Entry, Payment, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NO_PAYMENT, quote, tactical, using, warningsOf } from '../kit';
import { id } from './war_machine1';

/**
 * A tactical action in the home system produces `units` at the space dock of Home One: Production 5 (3 resources of
 * the planet plus 2 of Space Dock I).
 */
const produce = (units: UnitCounts, payment: Payment = NO_PAYMENT) => tactical(HOME, { production: units, payment });
const table = (entry: Entry, hand: string[] = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { hand }, entries: [entry], game: { docks: ['h1'] } });
const of = (entry: Entry, code: string, hand?: string[]) => warningsOf(table(entry, hand), entry).filter(w => w.code === code);

describe('actionCard:war_machine1 War Machine', () => {
  // "Apply +4 to the total PRODUCTION value of your units"
  // Checks: nine infantry are produced at a dock of Production 5 with War Machine used: no production warning.
  // Why the check is redundant here: the limit (68.1) is the total Production value, and the card raises it to 9 for
  // this use of Production; nine units are within it.
  test('actionCard:war_machine1 raises the Production value by 4: nine units at a dock of 5 are not over', () => {
    const entry = using(produce({ infantry: 9 }), id);
    quote(table(entry).pack, id, 'Apply +4 to the total PRODUCTION value of your units');
    expectNone(warningsOf(table(entry), entry), 'productionOver');
  });

  // LRR 68.1 (Production): the number of units produced is limited by the Production value.
  // Checks: the same nine infantry without the card are over the dock's 5.
  // Why the check is NOT redundant here: the card was not played; the dock's value stands.
  test('actionCard:war_machine1 not used, nine units at a dock of 5 are over', () => {
    const entry = produce({ infantry: 9 });
    expectStanding(warningsOf(table(entry), entry), 'productionOver');
    expect(of(entry, 'productionOver')[0].params).toMatchObject({ value: 5, count: 9 });
  });

  // "Apply +4 ..."
  // Checks: with the card the tenth unit is over, and the warning names the value 9.
  // Why the check is NOT redundant here: the card adds 4, it does not lift the limit.
  test('actionCard:war_machine1 the tenth unit is over a Production value of 9', () => {
    const entry = using(produce({ infantry: 10 }), id);
    expectStanding(warningsOf(table(entry), entry), 'productionOver');
    expect(of(entry, 'productionOver')[0].params).toMatchObject({ value: 9, count: 10 });
  });

  // Ruling 1: "A second War Machine cannot be played during use of production to give +8 to the total production
  //  value and/or to reduce the combined cost of the produced units by 2."
  // Checks: with two copies in hand and both used, thirteen units are over a value of 9, not 13.
  // Why the check is NOT redundant here: only one War Machine counts for one use of Production.
  test('actionCard:war_machine1 a second copy in the same production adds nothing', () => {
    const entry = { ...produce({ infantry: 13 }), uses: [id, id] } as Entry;
    expect(of(entry, 'productionOver', [id, id])[0].params).toMatchObject({ value: 9, count: 13 });
  });

  // "... and reduce the combined cost of the produced units by 1."
  // Checks: a cruiser (cost 2) is paid with Home Two alone (1 resource) and the card used: no shortfall.
  // Why the check is redundant here: the cost asked of the payment is 2 − 1 = 1, which the planet pays.
  test('actionCard:war_machine1 reduces the cost by 1: a cruiser is paid with one resource', () => {
    const entry = using(produce({ cruiser: 1 }, { planets: ['h2'], tradeGoods: 0 }), id);
    quote(table(entry).pack, id, 'reduce the combined cost of the produced units by 1');
    expectNone(warningsOf(table(entry), entry), 'shortResources');
  });

  // LRR 67 / 26.1: what is produced is paid in resources.
  // Checks: without the card the same payment is one short.
  // Why the check is NOT redundant here: the cruiser costs 2 and the card was not played.
  test('actionCard:war_machine1 not used, one resource does not pay a cruiser', () => {
    const entry = produce({ cruiser: 1 }, { planets: ['h2'], tradeGoods: 0 });
    expectStanding(warningsOf(table(entry), entry), 'shortResources');
    expect(of(entry, 'shortResources')[0].params).toMatchObject({ needed: 2, paid: 1 });
  });

  // Checks: the card in hand but not named by the action changes nothing.
  // Why the check is NOT redundant here: an action card acts only when played.
  test('actionCard:war_machine1 held but not used leaves the production limit as it is', () => {
    const entry = produce({ infantry: 9 });
    expectStanding(warningsOf(table(entry, [id]), entry), 'productionOver');
  });

  test('actionCard:war_machine1 is a play effect that lifts no check', () => {
    const { pack } = table(produce({}));
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
