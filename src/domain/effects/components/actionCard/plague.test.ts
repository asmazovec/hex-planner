import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './plague';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:plague Plague', () => {
  // "Choose 1 planet that is controlled by another player. Roll 1 die for each infantry on that planet. For each
  //  result of 6 or greater, destroy 1 of those units."
  // Checks: the card is a reminder only, shown in the block of the component step.
  // Why nothing is validated here: dice decide what is destroyed, and those are another player's units: the plan
  // does not roll, and the losses are entered by hand.
  test('actionCard:plague is a hint at the component step', () => {
    const { pack } = table();
    quote(pack, id, 'Roll 1 die for each infantry on that planet');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:plague is reminded of at the component step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'component', ['me']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'component', ['me']).map(def => def.id)).not.toContain(id);
  });
});
