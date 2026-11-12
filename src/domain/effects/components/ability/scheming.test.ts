import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './scheming';

describe('ability:scheming Scheming', () => {
  // "When you draw 1 or more action cards: Draw 1 additional action card. Then, choose and discard 1 action card from
  //  your hand."
  // Checks: the ability is a reminder where action cards are drawn: the status phase (2.1) and a strategy card (2.2).
  // Why nothing is validated here: the plan does not count how many cards a draw gives; the cards drawn and the one
  // discarded are entered by the player as the gains and spends of the entry (Yssaril notes 3-4: one more card
  // however many are drawn, and any card of the hand may go).
  test('ability:scheming is a hint where action cards are drawn', () => {
    const { pack } = bench({ faction: 'yssaril' });
    quote(pack, id, 'Draw 1 additional action card. Then, choose and discard 1 action card from your hand.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status', 'card']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
