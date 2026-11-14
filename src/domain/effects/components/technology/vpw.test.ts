import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './vpw';

describe('technology:vpw Valkyrie Particle Weave', () => {
  // "After making combat rolls during a round of ground combat, if your opponent produced 1 or more hits, you produce
  //  1 additional hit."
  // Checks: the technology is a reminder of the invasion.
  // Why nothing is validated here: the extra hit depends on the dice of both sides in a ground combat (tirules2,
  // Sardakk N'orr, Valkyrie Particle Weave notes 1-3), and the plan simulates no combat.
  test('technology:vpw is a reminder of the ground combat of the invasion', () => {
    const { pack } = bench({ faction: 'sardakk' });
    quote(pack, id, 'if your opponent produced 1 or more hits, you produce 1 additional hit');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });

  // Checks: researched, the technology stands among the reminders of the invasion, and not of the production.
  test('technology:vpw held stands among the reminders of the invasion', () => {
    const table = bench({ faction: 'sardakk', start: { technologies: [id] } });
    const board = endOf(table);
    expect(hintsAt(table.pack, board, 'invasion', ['me']).map(component => component.id)).toContain(id);
    expect(hintsAt(table.pack, board, 'production', ['me']).map(component => component.id)).not.toContain(id);
  });
});
