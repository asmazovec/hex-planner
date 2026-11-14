import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { ROW } from '../../../rules/kit';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './cv2';

/** Everything of `units` flies from the home system along the row to `to`, through every system between. */
const flight = (to: string, units: UnitCounts, technologies: string[] = []) => {
  const move = tactical(to, { moves: [{ from: HOME, units, via: ROW.slice(1, ROW.indexOf(to)) }] });
  return { move, ...bench({ faction: 'hacan', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:cv2 Carrier II', () => {
  // "Cost 3, Combat 9, Move 2, Capacity 6"
  // Checks: a Carrier II takes six infantry; no capacity warning is made.
  // Why the check finds nothing here: the capacity check (16.1) runs against the upgraded 6, a `modify`.
  test('technology:cv2 carries six ground forces: no capacity warning', () => {
    const table = flight(NEAR, { carrier: 1, infantry: 6 }, [id]);
    quote(table.pack, id, 'Move 2, Capacity 6');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // LRR 16.1: "A unit's capacity value indicates the maximum combined number of fighters and ground forces that it can
  //  transport."
  // Checks: a Carrier I (capacity 4) is over with six; a Carrier II is over with seven.
  // Why the check is NOT redundant here: the upgrade raises the number, it does not lift the check.
  test('technology:cv2 a Carrier I is over capacity with six, a Carrier II with seven', () => {
    const one = flight(NEAR, { carrier: 1, infantry: 6 });
    expectStanding(warningsOf(one, one.move), 'capacityGroup');
    const two = flight(NEAR, { carrier: 1, infantry: 7 }, [id]);
    expect(warningsOf(two, two.move).find(w => w.code === 'capacityGroup')?.params).toMatchObject({ load: 7, capacity: 6 });
  });

  // "Move 2"
  // Checks: a Carrier II reaches the target two systems away; a Carrier I does not.
  test('technology:cv2 moves two systems; a Carrier I falls short', () => {
    const two = flight(TARGET, { carrier: 1 }, [id]);
    expectNone(warningsOf(two, two.move), 'speedShort');
    const one = flight(TARGET, { carrier: 1 });
    expectStanding(warningsOf(one, one.move), 'speedShort');
  });

  test('technology:cv2 is a passive effect that changes the move and the capacity', () => {
    const { pack } = flight(NEAR, { carrier: 1 }, [id]);
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.modify?.capacity?.(4, { faction: 'hacan', unit: 'carrier' })).toBe(6);
  });
});
