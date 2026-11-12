import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './gift';

describe('promissory:gift Gift of Prescience', () => {
  // "At the end of the Strategy Phase: Place this card faceup in your play area and place the Naalu '0' token on your
  //  strategy card, you are the first in initiative order."
  // Checks: the note is a reminder in the block of the round, and nothing else.
  // Why nothing is validated: the plan keeps no initiative order (the player writes the entries in the order they
  // expect them), so being first changes no number and no check of the plan.
  test('promissory:gift is a hint of the round: the plan keeps no initiative order', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'you are the first in initiative order');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('promissory:gift returns to the Naalu player at the end of the status phase: the plan returns a note only right after it is played (69.3)');
});
