import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './extremeduress';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] } });

describe('actionCard:extremeduress Extreme Duress', () => {
  // "If that player's next action is not a strategic action, they discard all of their action cards, give you all of
  // their trade goods, and show you all of their secret objectives."
  // Checks: the card is a hint with no step of the plan; it waives nothing and changes no number.
  // Why nothing is validated here: Whether it does anything depends on another player's next action, a choice the
  // plan does not make for them; the trade goods received are entered by hand.
  test('actionCard:extremeduress is a hint without a step, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'they discard all of their action cards, give you all of their trade goods');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(undefined);
    expect(found.modify).toBeUndefined();
  });
});
