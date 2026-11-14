import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './argent_mech';

/** Everything of `units` flies from the home system to the next one. */
const flight = (faction: string, units: UnitCounts) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
  return { move, ...bench({ faction, expansions: ['pok'], units: { [HOME]: units }, entries: [move] }) };
};

describe('mech:argent_mech Aerie Sentinel', () => {
  // "This unit does not count against capacity if it is being transported or if it is in a space area with 1 or more
  //  of your ships that have capacity values."
  // Checks: a destroyer of the Argent Flight (Strike Wing Alpha, capacity 1) carries one infantry and one mech; both
  // capacity warnings, of the moving group and of the system it arrives in, are listed and lifted by the mech.
  // Why the check is redundant here: the capacity check (16.1, 16.3) counts every ground force as one place on board,
  // and the card says this unit is not counted; without it the load is the one infantry the destroyer has room for.
  test('mech:argent_mech rides on a destroyer beyond its capacity: the capacity warnings are waived', () => {
    const table = flight('argent', { destroyer: 1, infantry: 1, mech: 1 });
    quote(table.pack, id, 'This unit does not count against capacity if it is being transported');
    const warnings = warningsOf(table, table.move);
    expectWaived(warnings, 'capacityGroup', id);
    expectWaived(warnings, 'capacitySystem', id);
  });

  // Checks: the mech is not counted, everything else still is: two infantry and a mech on one place stay over.
  // Why the check is NOT redundant here: the second infantry is over capacity by itself, whatever the mech does.
  test('mech:argent_mech does not cover the other ground forces: two infantry on one place still stand over', () => {
    const table = flight('argent', { destroyer: 1, infantry: 2, mech: 1 });
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'capacityGroup');
    expectStanding(warnings, 'capacitySystem');
  });

  // "... in a space area with 1 or more of your ships that have capacity values." Ruling (Argent Flight, Aerie
  //  Sentinel 1): "An Aerie Sentinel cannot be transported by a ship without a capacity value."
  // Checks: a cruiser has no capacity value, so a mech on it stays over capacity.
  // Why the check is NOT redundant here: the card frees the mech from the count, not from needing a ship that transports.
  test('mech:argent_mech is not carried by a ship without a capacity value', () => {
    const table = flight('argent', { cruiser: 1, mech: 1 });
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // LRR 16.1: "A unit's capacity value indicates the maximum combined number of fighters and ground forces that it
  //  can transport."
  // Checks: the ability is printed on the Argent mech; the mech of another faction counts as any ground force.
  test('mech:argent_mech is the Argent Flight\'s own: another faction\'s mech counts against capacity', () => {
    const table = flight('letnev', { carrier: 1, infantry: 4, mech: 1 });
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // Checks: within capacity nothing is warned of, so nothing is waived either.
  test('mech:argent_mech within capacity makes no warning at all', () => {
    const table = flight('argent', { carrier: 1, infantry: 2, mech: 1 });
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  test('mech:argent_mech is a passive effect that waives both capacity checks', () => {
    const { pack } = flight('argent', { destroyer: 1 });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code).sort()).toEqual(['capacityGroup', 'capacitySystem']);
  });
});
