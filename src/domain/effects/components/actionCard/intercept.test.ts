import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './intercept';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:intercept Intercept', () => {
  // "Your opponent cannot retreat during this round of space combat."
  // Checks: the card is a reminder only, shown in the block of the combat step.
  // Why nothing is validated here: a retreat is declared in a space combat, which the plan does not simulate (no
  // dice, no rounds); where the ships end is entered by the moves of the next entries, so there is no check for the
  // card to lift.
  test('actionCard:intercept is a hint at the combat step', () => {
    const { pack } = table();
    quote(pack, id, 'cannot retreat during this round of space combat');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:intercept is reminded of at the combat step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'combat', ['me']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'combat', ['me']).map(def => def.id)).not.toContain(id);
  });
});
