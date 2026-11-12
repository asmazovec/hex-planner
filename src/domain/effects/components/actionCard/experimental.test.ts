import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './experimental';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:experimental Experimental Battlestation', () => {
  // "uses SPACE CANNON 5(x3) against the active player"
  // Checks: the card is a reminder of the movement step (the step of its window) and lifts no check.
  // Why nothing is validated: Space Cannon rolls dice, which the plan does not; what it destroys is entered as losses.
  test('actionCard:experimental is a hint of the movement step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "uses SPACE CANNON 5(x3) against the active player");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['movement'] });
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "uses SPACE CANNON 5(x3) against the active player"
  // Checks: held in hand, the card stands among the reminders of the movement block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: Space Cannon rolls dice, which the plan does not; what it destroys is entered as losses.
  test('actionCard:experimental in hand is a reminder of the movement block only', () => {
    expect(reminders([id], 'movement')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'movement')).not.toContain(id);
  });
});
