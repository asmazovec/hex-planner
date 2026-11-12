import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './blood_pact';

const table = () => bench({ faction: 'sol', expansions: ['pok'] });

describe('promissory:blood_pact Blood Pact', () => {
  // "When you and the Empyrean player cast votes for the same outcome, cast 4 additional votes for that outcome."
  // Checks: the note is a reminder that stands at the activation, where its return is triggered.
  // Why nothing is validated here: votes are not counted by the plan, and the return ("If you activate a system that
  // contains 1 or more of the Empyrean player's units, return this card") moves only a card played face up, while the
  // holdings do not tell a note in hand from one in a play area (69.5.1 is not modelled).
  test('promissory:blood_pact is a hint shown at the activation', () => {
    const { pack } = table();
    quote(pack, id, 'cast 4 additional votes for that outcome');
    quote(pack, id, 'If you activate a system that contains 1 or more of the Empyrean player\'s units, return this card to the Empyrean player.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('promissory:blood_pact goes back to the Empyrean player when its holder activates a system with Empyrean units: the holdings do not tell a note played face up from one in hand');
});
