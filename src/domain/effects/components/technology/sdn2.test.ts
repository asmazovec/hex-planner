import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './sdn2';

/** The L1Z1X fly `units` from the home system two systems away, to the target, with or without the upgrade. */
const flight = (units: UnitCounts, technologies: string[] = [id]) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units, via: [NEAR] }] });
  return { move, ...bench({ faction: 'l1z1x', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:sdn2 Super Dreadnought II', () => {
  // "Cost 4, Combat 4, Move 2, Capacity 2"
  // Checks: with the upgrade a super dreadnought reaches a system two away without a warning of its move value.
  // Why the check is redundant here: the move check (58.3.6) counts against the move value, and the upgrade's value
  // is 2 (generated from the unit tables, LRR 97.4), so the route of two systems is within it; nothing is waived.
  test('technology:sdn2 a super dreadnought moves two systems with the upgrade', () => {
    const table = flight({ dreadnought: 1 });
    quote(table.pack, id, 'Cost 4, Combat 4, Move 2, Capacity 2');
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
  // Checks: without the upgrade Super Dreadnought I moves 1, so the same route is warned of.
  // Why the check is NOT redundant here: the printed unit of the faction sheet has Move 1.
  test('technology:sdn2 without the upgrade the same route is beyond the move value', () => {
    const table = flight({ dreadnought: 1 }, []);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "Capacity 2"
  // Checks: two infantry ride on one super dreadnought; a third is over capacity.
  // Why the check is NOT redundant here: the upgrade sets the capacity to 2, it does not lift the capacity check.
  test('technology:sdn2 carries two ground forces and warns of the third', () => {
    const two = flight({ dreadnought: 1, infantry: 2 });
    expectNone(warningsOf(two, two.move), 'capacityGroup');
    const over = flight({ dreadnought: 1, infantry: 3 });
    expectStanding(warningsOf(over, over.move), 'capacityGroup');
  });

  // "This unit cannot be destroyed by "Direct Hit" action cards."
  // Checks: the effect is the generated unit upgrade (LRR 97.4), passive, with nothing waived and no reminder.
  // Why nothing is validated for Direct Hit: the plan resolves no action card of combat.
  test('technology:sdn2 is the generated passive unit upgrade and waives nothing', () => {
    const { pack } = flight({ dreadnought: 1 });
    quote(pack, id, 'This unit cannot be destroyed by "Direct Hit" action cards.');
    expect(effect(pack, id)).toMatchObject({ tier: 'passive', rule: '97.4' });
    expect(effect(pack, id).modify?.speed).toBeDefined();
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
