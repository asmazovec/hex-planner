import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './lead_rider';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:lead_rider Leadership Rider', () => {
  // "You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your prediction is correct, gain 3
  //  command tokens."
  // Checks: the card is a reminder only, with no step of its own.
  // Why nothing is validated here: the agenda phase is not replayed: votes and predictions are no part of the plan,
  // and the command tokens gained are entered by hand with an adjustment. The window is in the agenda phase, which
  // has no step (`stepsOfWindow`).
  test('actionCard:lead_rider is a hint without a step', () => {
    const { pack } = table();
    quote(pack, id, 'If your prediction is correct, gain 3 command tokens');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
