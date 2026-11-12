import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FARTHER, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './incursion';

describe('ability:incursion Incursion', () => {
  // "When you activate a system that contains a breach, you may flip that breach; systems that contain active breaches
  //  are adjacent."
  // Checks: the ability is a reminder in the blocks of activation and movement.
  // Why nothing is validated: breaches are not on the plan's board, so their flip and their removal change nothing it
  // holds.
  test('ability:incursion is a reminder of activation and movement', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['te'] });
    quote(pack, id, 'systems that contain active breaches are adjacent');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation', 'movement']);
  });

  // "... systems that contain active breaches are adjacent."
  // Checks: a cruiser jumps from home straight to the far end of the row, as it would between two breaches: the plan
  // counts it as one step and makes no warning.
  // Why the check is NOT made at all: two marked systems that are not joined are a jump (src/domain/movement.ts), which
  // the plan leaves to an ability it does not count; Incursion is one of them.
  test('ability:incursion a jump between two systems is one step and is not warned of', () => {
    const move = tactical(FARTHER, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const crimson = bench({ faction: 'crimson', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, entries: [move] });
    expectNone(warningsOf(crimson, move), 'speedShort');
    expectNone(warningsOf(crimson, move), 'routeBlocked');
  });

  test.todo('ability:incursion a breach flipped on activation and removed at the end of the status phase: breaches are not on the plan\'s board');
});
