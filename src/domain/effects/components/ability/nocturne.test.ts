import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nocturne';

describe('ability:nocturne Nocturne', () => {
  // "This faction cannot be chosen during setup."
  // Checks: the ability stands in no step of the plan and lifts no check.
  // Why nothing is validated: the choice of a faction happens when the game is created, before the plan; the replay
  // of entries has no step where it could be breached.
  test('ability:nocturne speaks of the setup only: no step, nothing waived', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'This faction cannot be chosen during setup.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  test.todo('ability:nocturne the Obsidian is not offered when a game is created: the choice of a faction is the setup screen\'s, outside the effects');
});
