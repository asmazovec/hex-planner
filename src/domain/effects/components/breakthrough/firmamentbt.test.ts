import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './firmamentbt';

describe('breakthrough:firmamentbt The Sowing', () => {
  // "When you gain this card and at the start of the status phase, you may place up to 3 of your trade goods on this
  //  card."
  // Checks: the breakthrough is a reminder of the status phase and lifts no check.
  // Why nothing is validated: setting trade goods aside is a choice whose only use comes after a change of faction
  // (The Reaping), which the plan does not model; the player enters the trade goods set aside by hand.
  test('breakthrough:firmamentbt is a reminder of the status phase and waives nothing', () => {
    const { pack } = bench({ faction: 'firmament', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may place up to 3 of your trade goods on this card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  test.todo('breakthrough:firmamentbt the trade goods on the card leave the player\'s trade goods: a store of trade goods on a card is not modelled');
});
