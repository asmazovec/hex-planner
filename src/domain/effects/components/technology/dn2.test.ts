import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './dn2';

const flight = (technologies: string[] = []) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1 }, via: [NEAR] }] });
  return { move, ...bench({ faction: 'hacan', units: { [HOME]: { dreadnought: 1 } }, start: { technologies }, entries: [move] }) };
};

describe('technology:dn2 Dreadnought II', () => {
  // "Cost 4, Combat 5, Move 2, Capacity 1"
  // Checks: a Dreadnought II reaches the target two systems away with no warning of its move.
  // Why the check finds nothing here: the move check (58) runs against the upgraded move 2, a `modify`.
  test('technology:dn2 moves two systems', () => {
    const table = flight([id]);
    quote(table.pack, id, 'Cost 4, Combat 5, Move 2, Capacity 1');
    expectNone(warningsOf(table, table.move), 'speedShort');
  });

  // Checks: a Dreadnought I (move 1) falls short of the same target.
  // Why the check is NOT redundant here: without the upgrade the printed move 1 stands.
  test('technology:dn2 a Dreadnought I falls short of a system two away', () => {
    const table = flight();
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "This unit cannot be destroyed by "Direct Hit" action cards."
  test.todo('technology:dn2 the protection from Direct Hit is a reminder of the combat: a passive effect cannot carry `hintAt`, and the plan does not fight the combat');

  test('technology:dn2 is a passive effect that changes the move only', () => {
    const { pack } = flight([id]);
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.waive).toBeUndefined();
    expect(found.modify?.speed?.(1, { faction: 'hacan', unit: 'dreadnought' })).toBe(2);
    expect(found.modify?.capacity?.(1, { faction: 'hacan', unit: 'dreadnought' })).toBe(1);
    expect(found.modify?.unitCost?.(4, { faction: 'hacan', unit: 'dreadnought' })).toBe(4);
  });
});
