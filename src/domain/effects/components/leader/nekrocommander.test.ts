import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nekrocommander';

describe('leader:nekrocommander Nekro Acidos', () => {
  // "After you gain a technology: You may draw 1 action card."
  // Checks: the commander is a reminder of the strategy card step, where technologies are mostly gained.
  // Why nothing is validated: a card drawn from the deck is entered as a gain, and no rule of the plan limits drawing.
  test('leader:nekrocommander is a hint of the strategy card step', () => {
    const { pack } = bench({ faction: 'nekro', expansions: ['pok'] });
    quote(pack, id, 'After you gain a technology: You may draw 1 action card.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
  });
});
