import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './f_prototype';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:f_prototype Fighter Prototype', () => {
  // "Apply +2 to the result of each of your fighters' combat rolls"
  // Checks: the card is a reminder of the combat step (the step of its window) and lifts no check.
  // Why nothing is validated: a change of combat rolls, and the plan simulates no combat.
  test('actionCard:f_prototype is a hint of the combat step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "Apply +2 to the result of each of your fighters' combat rolls");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "Apply +2 to the result of each of your fighters' combat rolls"
  // Checks: held in hand, the card stands among the reminders of the combat block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: a change of combat rolls, and the plan simulates no combat.
  test('actionCard:f_prototype in hand is a reminder of the combat block only', () => {
    expect(reminders([id], 'combat')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'combat')).not.toContain(id);
  });
});
