import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { ROW } from '../../../rules/kit';
import { bench, effect, expectNone, expectStanding, FAR, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './cr2';

/** Everything of `units` flies from the home system along the row to `to`, through every system between. */
const flight = (to: string, units: UnitCounts, technologies: string[] = []) => {
  const move = tactical(to, { moves: [{ from: HOME, units, via: ROW.slice(1, ROW.indexOf(to)) }] });
  return { move, ...bench({ faction: 'hacan', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:cr2 Cruiser II', () => {
  // "Cost 2, Combat 6, Move 3, Capacity 1"
  // Checks: a Cruiser II carries one infantry; no capacity warning is made at all.
  // Why the check finds nothing here: the capacity check stands (16.1), but its number is the upgraded capacity 1:
  // a `modify`, nothing is listed as waived.
  test('technology:cr2 carries one ground force: no capacity warning', () => {
    const table = flight(NEAR, { cruiser: 1, infantry: 1 }, [id]);
    quote(table.pack, id, 'Move 3, Capacity 1');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // LRR 16.1: "A unit's capacity value indicates the maximum combined number of fighters and ground forces that it can
  //  transport."
  // Checks: Cruiser I has no capacity value: the same infantry is over capacity; and the second infantry is over the
  // capacity of Cruiser II.
  // Why the check is NOT redundant here: the upgrade gives one place, not more, and nothing without it.
  test('technology:cr2 a Cruiser I carries nothing, and a Cruiser II carries no second ground force', () => {
    const one = flight(NEAR, { cruiser: 1, infantry: 1 });
    expectStanding(warningsOf(one, one.move), 'capacityGroup');
    const two = flight(NEAR, { cruiser: 1, infantry: 2 }, [id]);
    expectStanding(warningsOf(two, two.move), 'capacityGroup');
  });

  // "Move 3"
  // Checks: a Cruiser II reaches a system three away; a Cruiser I (move 2) falls short of it.
  // Why the check is NOT redundant without it: the move value is the printed 2 until the upgrade is owned.
  test('technology:cr2 moves three systems; a Cruiser I falls short', () => {
    const two = flight(FAR, { cruiser: 1 }, [id]);
    expectNone(warningsOf(two, two.move), 'speedShort');
    const one = flight(FAR, { cruiser: 1 });
    expectStanding(warningsOf(one, one.move), 'speedShort');
  });

  test('technology:cr2 is a passive effect that changes the move and the capacity', () => {
    const { pack } = flight(NEAR, { cruiser: 1 }, [id]);
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.modify?.speed?.(2, { faction: 'hacan', unit: 'cruiser' })).toBe(3);
    expect(found.modify?.capacity?.(0, { faction: 'hacan', unit: 'cruiser' })).toBe(1);
    expect(found.modify?.unitCost?.(2, { faction: 'hacan', unit: 'cruiser' })).toBe(2);
  });
});
