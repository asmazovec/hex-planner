import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './gls';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', start: { technologies: [id] } });

describe('technology:gls Graviton Laser System', () => {
  // "hits produced by those units must be assigned to non-fighter ships if able"
  // Checks: the card is a reminder, shown in the block of the step `combat` to the player who holds it.
  // Why nothing is validated: SPACE CANNON is dice and the assignment of hits, neither of which the plan simulates.
  test('technology:gls is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'hits produced by those units must be assigned to non-fighter ships if able');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(t.pack, id).waive).toBeUndefined();
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:gls is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'combat', ['me']).map(c => c.id)).not.toContain(id);
  });
});
