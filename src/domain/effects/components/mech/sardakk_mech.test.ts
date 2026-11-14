import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sardakk_mech';

describe('mech:sardakk_mech Valkyrie Exoskeleton', () => {
  // "After this unit uses its SUSTAIN DAMAGE ability during ground combat, it produces 1 hit against your opponent's
  //  ground forces on this planet."
  // Checks: the mech's ability is a reminder of the invasion.
  // Why nothing is validated here: a hit produced in ground combat is part of the battle, which the plan does not
  // simulate (the losses of either side are entered by hand); the mech changes no number the plan counts.
  test('mech:sardakk_mech is a reminder of the ground combat of the invasion', () => {
    const { pack } = bench({ faction: 'sardakk', expansions: ['pok'] });
    quote(pack, id, 'it produces 1 hit against your opponent\'s ground forces on this planet');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });
});
