import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './garbozia';

describe('legendary:garbozia Dok \'N Pic\'s Salvage Yard', () => {
  // "You may exhaust this card when you pass to place 1 action card from the discard pile faceup on this card; you can
  //  purge cards on this card to play them as if they were in your hand."
  // Checks: the card is a reminder with no step, and lifts nothing.
  // Why nothing is validated: the plan keeps no discard pile, and an action card played from this card is named in
  // its entry like any card played; there is no count the card changes.
  test('legendary:garbozia is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['te'] });
    quote(pack, id, 'place 1 action card from the discard pile faceup on this card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
