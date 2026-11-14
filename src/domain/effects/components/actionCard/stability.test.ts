import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './stability';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:stability Political Stability', () => {
  // "Do not return your strategy card(s). You do not choose strategy cards during the next strategy phase."
  // Checks: the card is a reminder only, shown in the block of the status step.
  // Why nothing is validated here: no check of the plan asks which strategy card a player holds in the next round or
  // forbids the same card twice across rounds, so keeping the cards breaks nothing; the next round's card is entered
  // as it is kept.
  test('actionCard:stability is a hint at the status step', () => {
    const { pack } = table();
    quote(pack, id, 'Do not return your strategy card(s)');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:stability is reminded of at the status step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'status', ['me']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'status', ['me']).map(def => def.id)).not.toContain(id);
  });
});
