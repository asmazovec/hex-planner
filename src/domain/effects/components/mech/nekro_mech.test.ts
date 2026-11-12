import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nekro_mech';

describe('mech:nekro_mech Mordred', () => {
  // "apply +2 to the result of each of this unit's combat rolls."
  // Checks: the mech is a reminder of the combat step.
  // Why nothing is validated: a combat roll, and the plan simulates no combat.
  test('mech:nekro_mech is a hint of the combat: a combat roll', () => {
    const { pack } = bench({ faction: 'nekro', expansions: ['pok'] });
    quote(pack, id, "apply +2 to the result of each of this unit's combat rolls");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
