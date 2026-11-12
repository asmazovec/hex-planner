import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sorrow';

describe('ability:sorrow Sorrow', () => {
  // "When you create the game board, place the Sorrow (tile 94) where your home system would normally be placed"
  // Checks: the ability is a reminder of no step of the plan.
  // Why nothing is validated: it speaks of building the map before the game; the plan replays the game from its
  // start, and the map is built on the «Game» screen.
  test('ability:sorrow is a reminder of no step', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['te'] });
    quote(pack, id, 'place the Sorrow (tile 94) where your home system would normally be placed');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  test.todo('ability:sorrow the map puts the Sorrow in the Rebellion seat and its home off the board: the building of the map is not an effect of the replay');
});
