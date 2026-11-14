import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './jolnar_mech';

describe('mech:jolnar_mech Shield Paling', () => {
  // "Your infantry on this planet are not affected by your Fragile faction ability."
  // Checks: the mech is a reminder of the ground combat of the invasion.
  // Why nothing is validated here: Fragile is a -1 on combat rolls (ability:fragile is itself a hint), the plan makes
  // no combat rolls, so freeing infantry from it changes nothing counted. Ruling (tirules2, Jol-Nar, Shield Paling 1):
  // the mech itself is still affected, which the plan has no dice to show either.
  test('mech:jolnar_mech is a reminder of the invasion: Fragile changes no number the plan counts', () => {
    const { pack } = bench({ faction: 'jolnar', expansions: ['pok'] });
    quote(pack, id, 'Your infantry on this planet are not affected by your Fragile faction ability.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });
});
