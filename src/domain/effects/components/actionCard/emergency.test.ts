import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './emergency';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:emergency Emergency Repairs', () => {
  // "Repair all of your units that have SUSTAIN DAMAGE"
  // Checks: the card is a reminder of the combat step (the step of its window) and lifts no check.
  // Why nothing is validated: the plan keeps no damaged state of units, so a repair changes nothing it counts.
  test('actionCard:emergency is a hint of the combat step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "Repair all of your units that have SUSTAIN DAMAGE");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "Repair all of your units that have SUSTAIN DAMAGE"
  // Checks: held in hand, the card stands among the reminders of the combat block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: the plan keeps no damaged state of units, so a repair changes nothing it counts.
  test('actionCard:emergency in hand is a reminder of the combat block only', () => {
    expect(reminders([id], 'combat')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'combat')).not.toContain(id);
  });
});
