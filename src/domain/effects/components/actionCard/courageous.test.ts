import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './courageous';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:courageous Courageous to the End', () => {
  // "your opponent must choose and destroy 1 of their ships"
  // Checks: the card is a reminder of the combat step (the step of its window) and lifts no check.
  // Why nothing is validated: dice and the opponent's choice: the plan simulates no combat, the ships destroyed are entered as losses.
  test('actionCard:courageous is a hint of the combat step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "your opponent must choose and destroy 1 of their ships");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "your opponent must choose and destroy 1 of their ships"
  // Checks: held in hand, the card stands among the reminders of the combat block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: dice and the opponent's choice: the plan simulates no combat, the ships destroyed are entered as losses.
  test('actionCard:courageous in hand is a reminder of the combat block only', () => {
    expect(reminders([id], 'combat')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'combat')).not.toContain(id);
  });
});
