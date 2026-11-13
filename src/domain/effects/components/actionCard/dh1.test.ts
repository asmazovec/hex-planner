import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './dh1';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['rival']).map(component => component.id);
};

describe('actionCard:dh1 Direct Hit', () => {
  // "Destroy that ship."
  // Checks: the card is a reminder of the combat step (the step of its window) and lifts no check.
  // Why nothing is validated: hits and Sustain Damage belong to the combat the plan does not simulate; the ship destroyed is entered as a loss.
  test('actionCard:dh1 is a hint of the combat step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "Destroy that ship.");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "Destroy that ship."
  // Checks: held in hand, the card stands among the reminders of the combat block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: hits and Sustain Damage belong to the combat the plan does not simulate; the ship destroyed is entered as a loss.
  test('actionCard:dh1 in hand is a reminder of the combat block only', () => {
    expect(reminders([id], 'combat')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'combat')).not.toContain(id);
  });
});
