import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './crimson_mech';

describe('mech:crimson_mech Revenant', () => {
  // "DEPLOY: During the "Commit Ground Forces" step of your tactical action in a system that contains an active breach,
  //  you may commit 1 mech, even if you have no units in the system."
  // Checks: the mech is a reminder in the block of the invasion.
  // Why nothing is validated: its condition is an active breach in the active system, and breaches are not on the
  // plan's board.
  test('mech:crimson_mech is a reminder of the invasion', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may commit 1 mech, even if you have no units in the system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('mech:crimson_mech one mech from the reinforcements lands in a system with an active breach: breaches are not on the plan\'s board');
});
