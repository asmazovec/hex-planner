import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './parley';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:parley Parley', () => {
  // "Return the committed units to the space area."
  // Checks: the card is a reminder only, shown in the block of the invasion step.
  // Why nothing is validated here: the card changes another player's landing on my planet; that player's entry is
  // entered with the landing it ends with, so the plan has nothing to recount.
  test('actionCard:parley is a hint at the invasion step', () => {
    const { pack } = table();
    quote(pack, id, 'Return the committed units to the space area');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:parley is reminded of at the invasion step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'invasion', ['rival']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'invasion', ['rival']).map(def => def.id)).not.toContain(id);
  });
});
