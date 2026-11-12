import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, endOf, expectNone, expectStanding, HOME, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './ds';

/** Round 1: my infantry takes Target One (2 resources, 1 influence). Round 2: my home dock builds, paid with one planet. */
const take = () => tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
const build = (production: UnitCounts, planet = 't1') => tactical(HOME, { production, payment: { planets: [planet], tradeGoods: 0 } });
const table = (rounds: Entry[][]) => bench({
  faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 1 } }, rounds, game: { docks: ['h1'], planetControl: { t2: 'me' } },
});

describe('exploration:ds Dyson Sphere', () => {
  // "This planet's resource value is increased by 2 and its influence value is increased by 1."
  // Checks: Target One is explored with the card and attached; in round 2 it alone pays two cruisers (4 resources).
  // Why the check is redundant here: the payment is short only against the printed 2 resources; the planet's value is 4.
  test('exploration:ds the planet pays with two more resources', () => {
    const pay = build({ cruiser: 2 });
    const sphere = table([[using(take(), id)], [pay]]);
    quote(sphere.pack, id, "This planet's resource value is increased by 2");
    expectNone(warningsOf(sphere, pay), 'shortResources');
    expect(endOf(sphere).attachments?.t1).toContain(id);
  });

  // LRR 68.1 with the printed value: Target One gives 2 resources.
  // Checks: without the card the same payment is short.
  // Why the check is NOT redundant here: nothing raised the planet's value.
  test('exploration:ds without the card the planet pays its printed resources only', () => {
    const pay = build({ cruiser: 2 });
    expectStanding(warningsOf(table([[take()], [pay]]), pay), 'shortResources');
  });

  // "This planet's ..."
  // Checks: Target Two, in the same system, is not raised: alone it does not pay a cruiser.
  // Why the check is NOT redundant here: the card raises the one planet it is attached to.
  test('exploration:ds another planet of the system is not raised', () => {
    const pay = build({ cruiser: 1 }, 't2');
    expectStanding(warningsOf(table([[using(take(), id)], [pay]]), pay), 'shortResources');
  });
});
