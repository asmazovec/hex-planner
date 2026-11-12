import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './se2';

/** A Titans cruiser with `cargo` flies from the home system to `to`. */
const flight = (to: string, cargo: UnitCounts, technologies: string[] = [id]) => {
  const units = { cruiser: 1, ...cargo };
  const move = tactical(to, { moves: [{ from: HOME, units, via: to === FAR ? [NEAR, TARGET] : [] }] });
  return { move, ...bench({ faction: 'titans', expansions: ['pok'], units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:se2 Saturn Engine II', () => {
  // "Cost 2, Combat 6, Move 3, Capacity 2"
  // Checks: a Titans cruiser with the upgrade carries two infantry; no capacity warning is made.
  // Why the default limit does not apply: the upgrade changes the number itself (97.4: a unit upgrade puts the
  // numbers of its level II in place); the check runs against capacity 2 and finds nothing, so nothing is waived.
  test('technology:se2 a cruiser carries two ground forces', () => {
    const table = flight(NEAR, { infantry: 2 });
    quote(table.pack, id, 'Move 3, Capacity 2');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // Checks: a third infantry is beyond the new capacity and is warned of.
  // Why the check is NOT redundant here: the upgrade raises the capacity to 2, it does not remove it.
  test('technology:se2 a third ground force is still over capacity', () => {
    const table = flight(NEAR, { infantry: 3 });
    expect(warningsOf(table, table.move).find(w => w.code === 'capacityGroup')?.params).toMatchObject({ load: 3, capacity: 2 });
  });

  // Checks: the upgraded cruiser moves three systems.
  // Why the default limit does not apply: the move value is 3 with the upgrade.
  test('technology:se2 a cruiser moves three systems', () => {
    const table = flight(FAR, {});
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // Saturn Engine I: move 2, capacity 1.
  // Checks: without the upgrade the same flight is short of speed and the two infantry are over capacity.
  // Why the check is NOT redundant here: the Titans' cruiser of level I has the smaller numbers.
  test('technology:se2 without it the Titans cruiser is Saturn Engine I', () => {
    const slow = flight(FAR, { infantry: 2 }, []);
    const warnings = warningsOf(slow, slow.move);
    expectStanding(warnings, 'speedShort');
    expectStanding(warnings, 'capacityGroup');
  });

  test('technology:se2 is a passive unit upgrade with no waiver', () => {
    const { pack } = flight(NEAR, {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify?.capacity).toBeDefined();
  });
});
