import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sanction';

describe('actionCard:sanction Sanction', () => {
  // "Predict aloud an outcome of this agenda. If your prediction is correct, each player that voted for that outcome
  //  returns 1 command token from their fleet supply to their reinforcements."
  // Checks: the card is a hint with no step and lifts nothing.
  // Why nothing is validated here: the outcome and who voted for it are not part of the plan, so the plan cannot tell
  // whose fleet pool loses a token; a token lost is entered by hand.
  test('actionCard:sanction is a hint with no step: votes and outcomes are not counted', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'each player that voted for that outcome returns 1 command token from their fleet supply');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
