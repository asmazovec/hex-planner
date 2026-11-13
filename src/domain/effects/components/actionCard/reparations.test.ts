import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './reparations';

/** The card in my hand at the start of the plan. */
const table = (hand: string[] = [id]) => bench({ faction: 'sol', start: { hand } });

describe('actionCard:reparations Reparations', () => {
  // "Exhaust 1 planet that player controls and ready 1 planet you control."
  // Checks: the card is a reminder only, shown in the block of the invasion step.
  // Why nothing is validated here: the card is played in another player's turn, after that player takes a planet of
  // mine, and an entry names only its owner's components (a limit of the foundation): there is no entry of mine to
  // play it by. The planets readied and exhausted are entered by hand.
  test('actionCard:reparations is a hint at the invasion step', () => {
    const { pack } = table();
    quote(pack, id, 'Exhaust 1 planet that player controls and ready 1 planet you control');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  // Checks: the reminder stands at its step while the card is in hand, and not once it is not.
  // Why the reminder is NOT shown without the card: a hint is asked of what the player holds ready (`hintsAt`).
  test('actionCard:reparations is reminded of at the invasion step while it is in hand, and only then', () => {
    expect(hintsAt(table().pack, endOf(table()), 'invasion', ['rival']).map(def => def.id)).toContain(id);
    expect(hintsAt(table().pack, endOf(table([])), 'invasion', ['rival']).map(def => def.id)).not.toContain(id);
  });
});
