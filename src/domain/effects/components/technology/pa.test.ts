import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './pa';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = () => bench({ faction: 'sol', expansions: ['pok'], start: { technologies: [id] } });

describe('technology:pa Psychoarchaeology', () => {
  // "You can use technology specialties on planets you control without exhausting them"
  // Checks: the card is a reminder, shown in the block of the step `card` and the step `round` to the player who holds it.
  // Why nothing is validated: research checks no prerequisites (the point `prerequisites` is asked nowhere), so a technology specialty
  // used or not changes no warning.
  test('technology:pa is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'You can use technology specialties on planets you control without exhausting them');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['card','round'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:pa is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol', expansions: ['pok'] });
    expect(hintsAt(t.pack, endOf(t), 'card', ['me']).map(c => c.id)).not.toContain(id);
  });

  test.todo('technology:pa exhausting a planet with a technology specialty gains 1 trade good: an entry cannot carry the planets chosen for a component it uses (choices exist on component actions only), and this is no action');
});
