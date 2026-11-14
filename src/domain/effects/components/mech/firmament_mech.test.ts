import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './firmament_mech';

describe('mech:firmament_mech Viper EX-23', () => {
  // "When ground forces are committed to this planet, you may choose for your units to coexist, if they were not
  //  already."
  // Checks: the mech is a reminder of the invasion and lifts no check.
  // Why nothing is validated: the plan resolves no ground combat; the player enters who stays on the planet, and
  // the units of two players on one planet are not warned of, so coexisting needs nothing lifted.
  test('mech:firmament_mech is a reminder of the invasion and waives nothing', () => {
    const { pack } = bench({ faction: 'firmament', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may choose for your units to coexist');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('mech:firmament_mech coexisting units keep the planet\'s control unchanged: coexistence is not modelled, the invasion is resolved by the player');
});
