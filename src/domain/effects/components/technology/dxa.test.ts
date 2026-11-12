import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './dxa';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', start: { technologies: [id] } });

describe('technology:dxa Dacxive Animators', () => {
  // "After you win a ground combat, you may place 1 infantry from your reinforcements on that planet."
  // Checks: the card is a reminder, shown in the block of the step `invasion` to the player who holds it.
  // Why nothing is validated: the plan simulates no ground combat and never knows it was won; the infantry placed is entered by hand.
  test('technology:dxa is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'After you win a ground combat, you may place 1 infantry from your reinforcements on that planet.');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(t.pack, id).waive).toBeUndefined();
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:dxa is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'invasion', ['me']).map(c => c.id)).not.toContain(id);
  });
});
