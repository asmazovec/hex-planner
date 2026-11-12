import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './bastion_mech';

describe('mech:bastion_mech A3 Valiance', () => {
  // "When this unit is destroyed, if it was galvanized, galvanize up to 3 of your infantry in its system."
  // Checks: the mech's ability is a reminder of the battle in space and of the invasion.
  // Why nothing is validated here: the ability gives galvanize tokens, which only add dice; the plan rolls none and
  // keeps no galvanize tokens. The mech lost is entered by hand as a loss and counted as any other.
  test('mech:bastion_mech is a hint of the combat and the invasion steps, with no waiver', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'] });
    quote(pack, id, 'galvanize up to 3 of your infantry in its system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
