import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './x89c4';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', expansions: ['pok'], start: { technologies: [id] } });

describe('technology:x89c4 X-89 Bacterial Weapon ΩΩ', () => {
  // "Double the hits produced by your units' BOMBARDMENT and ground combat rolls."
  // Checks: the card is a reminder, shown in the block of the step `invasion` to the player who holds it.
  // Why nothing is validated: hits are dice, and the planet it exhausts is the opponent's, which my count does not hold.
  test('technology:x89c4 is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'Double the hits produced by your units\' BOMBARDMENT and ground combat rolls.');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(t.pack, id).waive).toBeUndefined();
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:x89c4 is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol', expansions: ['pok'] });
    expect(hintsAt(t.pack, endOf(t), 'invasion', ['me']).map(c => c.id)).not.toContain(id);
  });
});
