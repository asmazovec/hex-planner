import { describe, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, expectStanding, expectWaived, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './frln1';

/**
 * My carrier explored the empty system next door, which has no planet and so no space dock; the action produces there
 * and pays with Home Two (1 resource, 2 influence), or with both home planets (4 resources, 3 influence).
 */
const produce = (units: UnitCounts, planets: string[] = ['h2']) => tactical(NEAR, { production: units, payment: { planets, tradeGoods: 0 } });
const table = (move: Entry) => bench({ faction: 'sol', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, entries: [move] });

describe('exploration:frln1 Freelancers', () => {
  // "You may produce 1 unit in this system."
  // Checks: one cruiser produced in a system without a unit with Production; the warning is listed and lifted by the card.
  // Why the check is redundant here: LRR 67.1 lets a player produce only with a unit's Production ability, and the card
  // lets them produce one unit in this system without one.
  test('exploration:frln1 one unit produced in a system without a space dock: the warning is waived', () => {
    const move = using(produce({ cruiser: 1 }), id);
    const freelancers = table(move);
    quote(freelancers.pack, id, 'You may produce 1 unit in this system.');
    expectWaived(warningsOf(freelancers, move), 'noProduction', id);
  });

  // "You may spend influence as if it were resources to produce this unit."
  // Checks: the cruiser costs 2; Home Two gives 1 resource but 2 influence; the shortfall is listed and lifted.
  // Why the check is redundant here: the payment is short of resources only because it counts resources, and the card
  // lets the influence of the planet pay instead.
  test('exploration:frln1 influence pays the unit: the shortfall of resources is waived', () => {
    const move = using(produce({ cruiser: 1 }), id);
    expectWaived(warningsOf(table(move), move), 'shortResources', id);
  });

  // LRR 67.1 and 68.1: production needs a unit with Production and is paid in resources.
  // Checks: the same production without the card is warned of on both counts.
  // Why the check is NOT redundant here: nothing lets this player produce here.
  test('exploration:frln1 without the card the production stands warned of', () => {
    const move = produce({ cruiser: 1 });
    const warnings = warningsOf(table(move), move);
    expectStanding(warnings, 'noProduction');
    expectStanding(warnings, 'shortResources');
  });

  // "You may produce 1 unit ..."
  // Checks: two cruisers produced with the card: the lack of Production stands.
  // Why the check is NOT redundant here: the card allows one unit; the second has no Production to come from.
  test('exploration:frln1 a second unit is not covered: the lack of Production stands', () => {
    const move = using(produce({ cruiser: 2 }, ['h1', 'h2']), id);
    expectStanding(warningsOf(table(move), move), 'noProduction');
  });

  // "... spend influence as if it were resources ..." — a planet gives its influence or its resources, not both
  // (exploration notes, Freelancers 1).
  // Checks: a carrier costs 3; Home Two's 2 influence do not cover it, so the shortfall stands.
  // Why the check is NOT redundant here: even spent as influence the payment is short.
  test('exploration:frln1 influence short of the cost leaves the shortfall standing', () => {
    const move = using(produce({ carrier: 1 }), id);
    expectStanding(warningsOf(table(move), move), 'shortResources');
  });
});
