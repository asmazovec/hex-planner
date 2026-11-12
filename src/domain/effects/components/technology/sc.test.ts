import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sc';

describe('technology:sc Supercharge', () => {
  // "At the start of a combat round, you may exhaust this card to apply +1 to the result of each of your unit's combat
  //  rolls during this combat round."
  // Checks: the card is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: the card changes combat rolls, and the plan rolls no dice; there is no rule of the
  // plan the card could lift or number it could change.
  test('technology:sc is a hint at the combat step, with nothing to count', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'apply +1 to the result of each of your unit\'s combat rolls');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
