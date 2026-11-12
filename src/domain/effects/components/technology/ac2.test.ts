import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './ac2';

/** A Sol carrier flies with what rides on it, to the next system or two systems on. */
const flight = (units: UnitCounts, technologies: string[] = [id], target = NEAR) => {
  const move = tactical(target, { moves: [{ from: HOME, units, ...(target === TARGET ? { via: [NEAR] } : {}) }] });
  return { move, ...bench({ faction: 'sol', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:ac2 Advanced Carrier II', () => {
  // "Cost 3, Combat 9, Move 2, Capacity 8"
  // Checks: an upgraded Sol carrier takes eight infantry on board with no capacity warning.
  // Why the default limit does not apply: the upgrade changes the number itself (16.1 counts against the capacity
  // value, which is now 8): a generated `modify`, nothing is waived.
  test('technology:ac2 carries eight ground forces', () => {
    const table = flight({ carrier: 1, infantry: 8 });
    quote(table.pack, id, 'Move 2, Capacity 8');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // Checks: a ninth infantry is beyond the capacity of 8.
  // Why the check is NOT redundant here: the upgrade raises the capacity, it does not remove it.
  test('technology:ac2 still warns of a ninth ground force', () => {
    const table = flight({ carrier: 1, infantry: 9 });
    expect(warningsOf(table, table.move).find(w => w.code === 'capacityGroup')?.params).toMatchObject({ capacity: 8 });
  });

  // Checks: without the upgrade the Sol carrier (Advanced Carrier, capacity 6) is over with eight.
  // Why the check is NOT redundant here: the technology is not researched.
  test('technology:ac2 not researched, the carrier has the capacity of the Advanced Carrier', () => {
    const table = flight({ carrier: 1, infantry: 8 }, []);
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // "Move 2"
  // Checks: the upgraded carrier flies two systems; without the upgrade the same route is too long.
  // Why the check is NOT redundant here, without it: the Advanced Carrier moves 1.
  test('technology:ac2 moves two systems', () => {
    const fast = flight({ carrier: 1 }, [id], TARGET);
    expectNone(warningsOf(fast, fast.move), 'speedShort');
    const slow = flight({ carrier: 1 }, [], TARGET);
    expectStanding(warningsOf(slow, slow.move), 'speedShort');
  });

  test('technology:ac2 is the passive effect of a unit upgrade', () => {
    expect(effect(flight({ carrier: 1 }).pack, id).tier).toBe('passive');
  });
});
