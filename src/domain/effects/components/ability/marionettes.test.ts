import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './marionettes';

describe('ability:marionettes Marionettes', () => {
  // "The player or players whose control tokens are on each plot card are the puppeted players for that plot."
  // Checks: the ability stands in no step of the plan and lifts no check.
  // Why nothing is validated: it only defines the puppeted players for the other cards; plot cards are not tracked.
  test('ability:marionettes is a definition: no step, nothing waived', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'are the puppeted players for that plot');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
