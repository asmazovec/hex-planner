import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './l1z1x_mech';

describe('mech:l1z1x_mech Annihilator', () => {
  // "this unit can use its BOMBARDMENT ability on planets in its system as if it were a ship"
  // Checks: the component is a hint shown in the block of the invasion step, and lifts nothing.
  // Why nothing is validated here: BOMBARDMENT is a roll of dice the plan does not make; where a mech stands and what it carries are counted as for any mech.
  test('mech:l1z1x_mech is a hint at the invasion step and waives nothing', () => {
    const { pack } = bench({ faction: 'l1z1x', expansions: ['pok'] });
    quote(pack, id, "this unit can use its BOMBARDMENT ability on planets in its system as if it were a ship");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
