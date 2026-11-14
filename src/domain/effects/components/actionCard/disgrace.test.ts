import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './disgrace';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:disgrace Public Disgrace', () => {
  // "That player must choose a different strategy card instead, if able."
  // Checks: the card is a reminder only, with no step of its own.
  // Why nothing is validated here: the strategy phase choices of other players are not replayed; the window has no
  // step (`stepsOfWindow`).
  test('actionCard:disgrace is a hint without a step', () => {
    const { pack } = table();
    quote(pack, id, 'That player must choose a different strategy card instead');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
