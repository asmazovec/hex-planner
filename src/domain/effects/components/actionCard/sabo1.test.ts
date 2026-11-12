import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sabo1';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:sabo1 Sabotage', () => {
  // "Cancel that action card."
  // Checks: the card is a reminder only, with no step of its own.
  // Why nothing is validated here: it cancels another player's action card; that player's entry is entered without
  // the card, and the window is about other cards, so it has no step (`stepsOfWindow`).
  test('actionCard:sabo1 is a hint without a step', () => {
    const { pack } = table();
    quote(pack, id, 'Cancel that action card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
