import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './bunker';

/** A game where I hold the card in hand, or not. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });
const reminders = (hand: string[], step: Parameters<typeof hintsAt>[2]) => {
  const game = table(hand);
  return hintsAt(game.pack, endOf(game), step, ['me']).map(component => component.id);
};

describe('actionCard:bunker Bunker', () => {
  // "apply -4 to the result of each BOMBARDMENT roll"
  // Checks: the card is a reminder of the invasion step (the step of its window) and lifts no check.
  // Why nothing is validated: the plan rolls no dice: Bombardment hits are not computed, what they destroy is entered as losses, so no count or check of the plan changes with the card.
  test('actionCard:bunker is a hint of the invasion step that waives nothing', () => {
    const { pack } = table();
    quote(pack, id, "apply -4 to the result of each BOMBARDMENT roll");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(pack, id).modify).toBeUndefined();
  });

  // "apply -4 to the result of each BOMBARDMENT roll"
  // Checks: held in hand, the card stands among the reminders of the invasion block and of no other block; not
  // held, it is not shown.
  // Why nothing is validated: the plan rolls no dice: Bombardment hits are not computed, what they destroy is entered as losses, so no count or check of the plan changes with the card.
  test('actionCard:bunker in hand is a reminder of the invasion block only', () => {
    expect(reminders([id], 'invasion')).toContain(id);
    expect(reminders([id], 'production')).not.toContain(id);
    expect(reminders([], 'invasion')).not.toContain(id);
  });
});
