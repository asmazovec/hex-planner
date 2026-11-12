import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './empyreancommander';

describe('leader:empyreancommander Xuange', () => {
  // "After another player moves ships into a system that contains 1 of your command tokens: You may return that token
  //  to your reinforcements."
  // Checks: the commander is a reminder at the movement step.
  // Why nothing is validated here: it is resolved in another player's turn, on their move; a waiver or a play is asked
  // of the owner of the entry only, so the plan cannot take my token off the board in a rival's entry.
  test('leader:empyreancommander is a hint shown at the movement', () => {
    const { pack } = bench({ faction: 'empyrean', expansions: ['pok'] });
    quote(pack, id, 'You may return that token to your reinforcements.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  test.todo('leader:empyreancommander takes my token back when a rival moves into its system: tied to another player\'s turn, not modelled');
});
