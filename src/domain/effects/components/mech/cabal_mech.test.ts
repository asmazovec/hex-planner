import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './cabal_mech';

describe('mech:cabal_mech Reanimator', () => {
  // "When your infantry on this planet are destroyed, place them on your faction sheet; those units are captured."
  // Checks: the mech's ability is a reminder of the invasion, where ground combat is fought.
  // Why nothing is validated here: the plan rolls no ground combat and keeps no captured units.
  test('mech:cabal_mech is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'cabal', expansions: ['pok'] });
    quote(pack, id, 'those units are captured');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('mech:cabal_mech captures the infantry destroyed on its planet: captured units are not modelled');
});
