import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, NO_PAYMENT, quote, tactical, using, warningsOf } from '../kit';
import { id } from './hacanhero';

/** The Hacan produce at home from the space dock on Home One (Production 3 + 2 = 5), paying nothing. */
const produce = (production: UnitCounts) => tactical(HOME, { production, payment: NO_PAYMENT });
const table = (entries: Entry[]) =>
  bench({ faction: 'hacan', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries, game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });

describe('leader:hacanhero Harrugh Gefhara — Galactic Securities Net', () => {
  // "When 1 or more of your units use PRODUCTION: You may reduce the cost of each of your units to 0 during this use
  //  of PRODUCTION."
  // Checks: two cruisers produced with the hero named in the entry owe nothing: no resources are short.
  // Why the check is redundant here: 67.2 asks the cost of the units in resources; the hero makes that cost 0.
  test('leader:hacanhero used with a production makes the units cost nothing', () => {
    const build = using(produce({ cruiser: 2 }), id);
    const hacan = table([build]);
    quote(hacan.pack, id, 'You may reduce the cost of each of your units to 0 during this use of PRODUCTION.');
    expectNone(warningsOf(hacan, build), 'shortResources');
  });

  // LRR 67.2: the units produced are paid for with resources.
  // Checks: without the hero the same production is short of 4 resources.
  // Why the check is NOT redundant here: the hero was not named, so the cost stands.
  test('leader:hacanhero not used, the production must be paid for', () => {
    const build = produce({ cruiser: 2 });
    expectStanding(warningsOf(table([build]), build), 'shortResources');
  });

  // Ruling (Hacan, Harrugh Gefhara 1): "Production limits still apply."
  // Checks: six cruisers from a dock of Production 5 are warned of even at no cost.
  // Why the check is NOT redundant here: the hero changes the cost, not the number of units produced.
  test('leader:hacanhero does not lift the production limit', () => {
    const build = using(produce({ cruiser: 6 }), id);
    expectStanding(warningsOf(table([build]), build), 'productionOver');
  });

  // "If you do, purge this card."
  // Checks: used once, the hero is purged; played again later it is warned of.
  // Why the check is NOT redundant here: a hero is spent by its ability (51.12).
  test('leader:hacanhero is purged by its use', () => {
    const again = componentAction(id);
    const hacan = table([using(produce({ cruiser: 2 }), id), again]);
    expect(endOf(hacan).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(hacan, again), 'componentNotHeld');
  });

  test('leader:hacanhero is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
