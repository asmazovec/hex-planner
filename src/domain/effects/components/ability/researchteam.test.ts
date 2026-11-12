import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './researchteam';

describe('ability:researchteam Research Team', () => {
  // "When ground forces are committed: if your units on that planet are not already coexisting, you may choose for
  //  your units to coexist."
  // Checks: the ability is a reminder of the invasion's block.
  // Why the check is NOT redundant here: nothing is validated, because the plan has no coexistence: a landing on a
  // planet takes it (49.5), and ground combat is not simulated. Whether the Deepwrought units coexist instead is the
  // player's choice at the table, which the plan neither makes nor checks.
  test('ability:researchteam is a hint at the invasion: coexistence is not modelled', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may choose for your units to coexist');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
