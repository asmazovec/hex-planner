import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ralnel_mech';

describe('mech:ralnel_mech Alarum', () => {
  // "At the end of a round of combat on this planet, you may move up to 2 of your ground forces to this planet from
  //  planets in adjacent systems."
  // Checks: the mech is a reminder in the block of the invasion.
  // Why nothing is validated: rounds of ground combat are not simulated, so the ground forces it brings in mid-combat
  // are not an entry of the plan.
  test('mech:ralnel_mech is a reminder of the invasion', () => {
    const { pack } = bench({ faction: 'ralnel', expansions: ['pok', 'te'] });
    quote(pack, id, 'At the end of a round of combat on this planet');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('mech:ralnel_mech ground forces moved in from adjacent systems at the end of a round of ground combat: rounds of combat are not simulated');
});
