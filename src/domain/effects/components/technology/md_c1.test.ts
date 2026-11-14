import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './md_c1';

describe('technology:md_c1 Magen Defense Grid Ω', () => {
  // "At the start of ground combat on a planet that contains 1 or more of your structures, produce 1 hit and assign it
  //  to 1 of your opponent's ground forces."
  // Checks: the technology is a reminder of the invasion step, where ground combat is fought.
  // Why nothing is validated here: the hit destroys an opponent's ground force in a combat the plan does not fight;
  // the losses of other players are not part of my entries.
  test('technology:md_c1 is a hint of the invasion', () => {
    const table = bench({ faction: 'hacan', expansions: ['pok'], start: { technologies: [id] } });
    quote(table.pack, id, 'produce 1 hit and assign it to 1 of your opponent\'s ground forces');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(hintsAt(table.pack, endOf(table), 'invasion', ['me']).map(c => c.id)).toContain(id);
  });
});
