import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './bio';

describe('technology:bio Bioplasmosis', () => {
  // "At the end of the status phase, you may remove any number of infantry from planets you control and place them on
  //  1 or more planets you control in the same or adjacent systems."
  // Checks: the technology is a reminder in the status block.
  // Why nothing is validated: the replay checks no movement of ground forces outside a tactical action (there is no
  // rule of the count it would break), and the status entry holds no ground forces to move: the move is an adjustment.
  test('technology:bio is a hint in the status block', () => {
    const table = bench({ faction: 'arborec', start: { technologies: [id] } });
    quote(table.pack, id, 'place them on 1 or more planets you control in the same or adjacent systems');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toEqual(['status']);
    expect(hintsAt(table.pack, endOf(table), 'status', ['me']).map(c => c.id)).toContain(id);
  });

  test.todo('technology:bio moves infantry between planets at the end of the status phase: the status entry holds no ground forces to move, an adjustment does it');
});
