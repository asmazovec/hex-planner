import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './x89';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', expansions: ['pok'], start: { technologies: [id] } });

describe('technology:x89 X-89 Bacterial Weapon Ω', () => {
  // "if at least 1 of your opponent's infantry was destroyed"
  // Checks: the card is a reminder, shown in the block of the step `invasion` to the player who holds it.
  // Why nothing is validated: it hangs on the dice of a bombardment, which the plan does not roll.
  test('technology:x89 is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'if at least 1 of your opponent\'s infantry was destroyed');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:x89 is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol', expansions: ['pok'] });
    expect(hintsAt(t.pack, endOf(t), 'invasion', ['me']).map(c => c.id)).not.toContain(id);
  });
});
