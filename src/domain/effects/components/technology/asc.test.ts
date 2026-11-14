import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './asc';

describe('technology:asc Assault Cannon', () => {
  // "At the start of a space combat in a system that contains 3 or more of your non-fighter ships, your opponent must
  //  destroy 1 of their non-fighter ships."
  // Checks: the technology is a reminder of the combat block only.
  // Why nothing is validated here: the ship destroyed is the opponent's, and the losses of other players are not part
  // of my action (`losses` holds mine); the plan does not fight the battle.
  test('technology:asc is a hint of the combat', () => {
    const table = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(table.pack, id, 'your opponent must destroy 1 of their non-fighter ships');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    const board = endOf(table);
    expect(hintsAt(table.pack, board, 'combat', ['me']).map(c => c.id)).toContain(id);
    expect(hintsAt(table.pack, board, 'invasion', ['me']).map(c => c.id)).not.toContain(id);
  });
});
