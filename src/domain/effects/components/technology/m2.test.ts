import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, FARTHER, HOME, quote, TARGET, NEAR, tactical, warningsOf } from '../kit';
import { id } from './m2';

/** The Nomad flagship flies from the home system to `target` along `via`, with or without Memoria II; `units` stand elsewhere. */
const flight = (target: string, via: string[], technologies: string[], units: Record<string, UnitCounts> = {}) => {
  const move = tactical(target, { moves: [{ from: HOME, units: { flagship: 1 }, via }] });
  return { move, ...bench({ faction: 'nomad', expansions: ['pok'], units: { [HOME]: { flagship: 1 }, ...units }, start: { technologies }, entries: [move] }) };
};

describe('technology:m2 Memoria II', () => {
  // "Cost 8, Combat 5(x2), Move 2, Capacity 6"
  // Checks: with Memoria II the flagship flies two systems with no speed warning.
  // Why the check is redundant here: the move value is 2 instead of Memoria I's 1 (a change of the number, generated
  // from the unit table), so the route of two systems is within it.
  test('technology:m2 the flagship moves 2', () => {
    const table = flight(TARGET, [NEAR], [id]);
    quote(table.pack, id, 'Move 2, Capacity 6');
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: Memoria I moves 1, so the same route is warned of.
  // Why the check is NOT redundant here: without the upgrade the flagship has its printed move value of 1.
  test('technology:m2 without the upgrade the flagship is short of two systems', () => {
    const table = flight(TARGET, [NEAR], []);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: Memoria II carries six: a flagship with six infantry is within capacity.
  test('technology:m2 the flagship carries 6', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { flagship: 1, infantry: 6 } }] });
    const table = bench({ faction: 'nomad', expansions: ['pok'], units: { [HOME]: { flagship: 1, infantry: 6 } }, start: { technologies: [id] }, entries: [move] });
    expectNone(warningsOf(table, move), 'capacityGroup');
  });

  // "You may treat this unit as if it were adjacent to systems that contain one or more of your mechs."
  // Checks: the flagship flies straight from the home system to the far end of the row, where a mech of mine stands;
  // the route is a jump of one step and no speed warning is made.
  // Why the check is redundant here: the system of the mech is adjacent to the flagship, so it is one system away;
  // the plan takes two marked systems with nothing between them as a jump of one step and warns of no jump.
  test('technology:m2 the flagship jumps to a system of its mechs in one step', () => {
    const table = flight(FARTHER, [], [id], { [FARTHER]: { mech: 1 } });
    quote(table.pack, id, 'adjacent to systems that contain one or more of your mechs');
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  test('technology:m2 is a passive effect with the generated numbers and no waiver', () => {
    const { pack } = flight(NEAR, [], [id]);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
