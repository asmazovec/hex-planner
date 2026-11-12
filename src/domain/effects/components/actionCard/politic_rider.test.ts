import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './politic_rider';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:politic_rider Politics Rider', () => {
  // "You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your prediction is correct, draw 3
  //  action cards and gain the speaker token."
  // Checks: the card is a reminder only, with no step of its own.
  // Why nothing is validated here: the agenda phase is not replayed; the action cards drawn are entered in `gains`
  // by hand, and the speaker token is not counted by the plan.
  test('actionCard:politic_rider is a hint without a step', () => {
    const { pack } = table();
    quote(pack, id, 'draw 3 action cards and gain the speaker token');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
