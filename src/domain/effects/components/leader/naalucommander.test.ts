import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naalucommander';

describe('leader:naalucommander M\'aban', () => {
  // "At any time: You may look at your neighbors' hands of promissory notes and the top and bottom card of the agenda deck."
  // Checks: the commander is a hint with no step.
  // Why nothing is validated: it only looks at hidden cards, which the plan does not keep.
  test('leader:naalucommander is a hint with no step: looking at hidden cards counts nothing', () => {
    const { pack } = bench({ faction: 'naalu', expansions: ['pok'] });
    quote(pack, id, "look at your neighbors' hands of promissory notes");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
