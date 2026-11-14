import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './nm';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', start: { technologies: [id] } });

describe('technology:nm Neural Motivator', () => {
  // "During the status phase, draw 2 action cards instead of 1."
  // Checks: the card is a reminder, shown in the block of the step `status` to the player who holds it.
  // Why nothing is validated: the plan draws no action card by itself: the card of step 81.3 is entered by hand in the status entry, and no
  // check counts the cards drawn, so there is nothing to lift and no number to change.
  test('technology:nm is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'During the status phase, draw 2 action cards instead of 1.');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['status'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:nm is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'status', ['me']).map(c => c.id)).not.toContain(id);
  });
});
