import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './det';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', start: { technologies: [id] } });

describe('technology:det Dark Energy Tap', () => {
  // "explore that token"
  // Checks: the card is a reminder, shown in the block of the step `activation` and the step `combat` to the player who holds it.
  // Why nothing is validated: the plan holds no frontier tokens and no exploration decks (what an exploration brings is entered by hand),
  // and a retreat belongs to the combat it does not simulate.
  test('technology:det is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'explore that token');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['activation','combat'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:det is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'activation', ['me']).map(c => c.id)).not.toContain(id);
  });
});
