import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './survivalinstinct';

describe('ability:survivalinstinct Survival Instinct', () => {
  // "After another player activates a system that contains your ships: you may move up to 2 of your ships into the
  //  active system from adjacent systems that do not contain your command tokens."
  // Checks: the ability is a reminder in the block of activation.
  // Why nothing is validated: the move is made in another player's turn; the plan enters my moves only in my own
  // tactical actions, so it holds no entry this ability could lift a check of.
  test('ability:survivalinstinct is a reminder at activation', () => {
    const { pack } = bench({ faction: 'ralnel', expansions: ['te'] });
    quote(pack, id, 'After another player activates a system that contains your ships');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.todo('ability:survivalinstinct up to 2 ships move into another player\'s active system: the plan has no entry for my move in another player\'s turn');
});
