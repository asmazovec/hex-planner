import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './xxcha_mech';

describe('mech:xxcha_mech Indomitus', () => {
  // "You may use this unit's SPACE CANNON against ships that are in adjacent systems."
  // Checks: the mech is a reminder of the combat step and lifts nothing.
  // Why nothing is validated: SPACE CANNON is a roll of the combat (77); the plan rolls no dice, it records the losses
  // the player enters.
  test('mech:xxcha_mech is a hint of the combat step', () => {
    const { pack } = bench({ faction: 'xxcha', expansions: ['pok'] });
    quote(pack, id, 'SPACE CANNON against ships that are in adjacent systems');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
