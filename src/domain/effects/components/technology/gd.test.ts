import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './gd';

/** `units` fly from the home system along the row to `target`: FAR is 3 systems away, FARTHER 4. */
const flight = (units: UnitCounts, target: string, technologies: string[] = [id]) => {
  const via = [NEAR, TARGET, FAR, FARTHER].slice(0, [NEAR, TARGET, FAR, FARTHER].indexOf(target));
  const move = tactical(target, { moves: [{ from: HOME, units, via }] });
  return { move, ...bench({ faction: 'sol', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:gd Gravity Drive', () => {
  // "After you activate a system, apply +1 to the move value of 1 of your ships during this tactical action."
  // Checks: one cruiser (move 2) flies 3 systems to the active system; the speed warning is listed and lifted by the card.
  // Why the check is redundant here: 58.3.6 lets a ship enter no more systems than its move value, and the card adds 1
  // to the move value of one ship of this tactical action: 2 + 1 covers the 3 systems.
  test('technology:gd lets one ship fly one system beyond its move value: the speed warning is waived', () => {
    const table = flight({ cruiser: 1 }, FAR);
    quote(table.pack, id, 'apply +1 to the move value of 1 of your ships during this tactical action');
    expectWaived(warningsOf(table, table.move), 'speedShort', id);
  });

  // "... of 1 of your ships ..."
  // Checks: two cruisers each short by one: the card speeds only one of them, so the warning stands.
  // Why the check is NOT redundant here: the second cruiser still has move 2 for a route of 3.
  test('technology:gd covers one ship only: two ships short of the route still stand', () => {
    const table = flight({ cruiser: 2 }, FAR);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  // "apply +1 to the move value"
  // Checks: a cruiser 4 systems away is short by 2; +1 does not bring it there.
  // Why the check is NOT redundant here: the card adds 1, not as much as the route needs.
  test('technology:gd adds 1 only: a ship short by two still stands', () => {
    const table = flight({ cruiser: 1 }, FARTHER);
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'speedShort');
    expect(warnings.find(w => w.code === 'speedShort')?.params).toMatchObject({ move: 2, steps: 4 });
  });

  // LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
  // Checks: without the card the same cruiser 3 systems away is warned of.
  // Why the check is NOT redundant here: nothing this player holds changes a move value.
  test('technology:gd not held: the ship short by one stands', () => {
    const table = flight({ cruiser: 1 }, FAR, []);
    expectStanding(warningsOf(table, table.move), 'speedShort');
  });

  test('technology:gd is a passive effect that waives the speed check', () => {
    const { pack } = flight({ cruiser: 1 }, FAR);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['speedShort']);
  });
});
