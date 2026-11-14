import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './exo2';

/** A Sardakk dreadnought carries one infantry two systems, from the home system to the target. */
const run = (technologies: string[], infantry = 1) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1, infantry }, via: [NEAR] }] });
  return { move, ...bench({ faction: 'sardakk', units: { [HOME]: { dreadnought: 1, infantry } }, start: { technologies }, entries: [move] }) };
};

describe('technology:exo2 Exotrireme II', () => {
  // "Cost 4, Combat 5, Move 2, Capacity 1"
  // Checks: with the upgrade the Sardakk dreadnought flies two systems with one infantry aboard: no warning of speed
  // or capacity.
  // Why the check is redundant here: the move of the Exotrireme I is 1; the upgrade's printed move of 2 replaces it
  // (90.6.1), so the two steps are within its move, a `modify` of the generated upgrade and not a waiver.
  test('technology:exo2 lets the dreadnought fly two systems with one ground force aboard', () => {
    const table = run([id]);
    quote(table.pack, id, 'Cost 4, Combat 5, Move 2, Capacity 1');
    const warnings = warningsOf(table, table.move);
    expectNone(warnings, 'speedShort');
    expectNone(warnings, 'capacityGroup');
  });

  // Checks: without the upgrade the same flight is beyond the Exotrireme I's move of 1.
  // Why the check is NOT redundant here: the move is raised only by the upgrade the player holds.
  test('technology:exo2 not researched: the Exotrireme I does not fly two systems', () => {
    const table = run([]);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: the capacity stays 1: a second infantry is over it.
  // Why the check is NOT redundant here: the upgrade raises the move, not the capacity.
  test('technology:exo2 keeps a capacity of one: a second ground force aboard is over it', () => {
    const table = run([id], 2);
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // "After a round of space combat, you may destroy this unit to destroy up to 2 ships in this system."
  // Checks: the file of the unit upgrade is passive and lifts no check.
  // Why nothing more is validated: the rest of the text is combat, which the plan does not simulate.
  test('technology:exo2 is the passive effect of a unit upgrade, with no waiver', () => {
    const { pack } = run([id]);
    quote(pack, id, 'you may destroy this unit to destroy up to 2 ships in this system');
    expect(effect(pack, id).tier).toBe('passive');
  });
});
