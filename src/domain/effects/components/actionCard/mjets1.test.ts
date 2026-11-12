import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './mjets1';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:mjets1 Maneuvering Jets', () => {
  // "Cancel 1 hit."
  // Checks: the card is a reminder only, shown in the block of the combat step.
  // Why nothing is validated here: the hits of a SPACE CANNON roll come from dice the plan does not roll; a ship
  // that survives simply stays in the plan as entered.
  test('actionCard:mjets1 is a hint at the combat step', () => {
    const { pack } = table();
    quote(pack, id, 'Cancel 1 hit');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:mjets1 is reminded of at the combat step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'combat', ['me']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'combat', ['me']).map(def => def.id)).not.toContain(id);
  });
});
