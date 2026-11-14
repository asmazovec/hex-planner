import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './sdn';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', start: { technologies: [id] } });

describe('technology:sdn Scanlink Drone Network', () => {
  // "you may explore 1 planet in that system which contains 1 or more of your units"
  // Checks: the card is a reminder, shown in the block of the step `activation` to the player who holds it.
  // Why nothing is validated: the plan holds no exploration decks; what an exploration brings is entered by hand.
  test('technology:sdn is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'you may explore 1 planet in that system which contains 1 or more of your units');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['activation'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:sdn is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'activation', ['me']).map(c => c.id)).not.toContain(id);
  });
});
