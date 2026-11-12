import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './mentak_mech';

describe('mech:mentak_mech Moll Terminus', () => {
  // "Other player's ground forces on this planet cannot use SUSTAIN DAMAGE"
  // Checks: the component is a hint shown in the block of the invasion step, and lifts nothing.
  // Why nothing is validated here: SUSTAIN DAMAGE belongs to combat, which the plan does not resolve; the losses are entered by hand.
  test('mech:mentak_mech is a hint at the invasion step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak', expansions: ['pok'] });
    quote(pack, id, "Other player's ground forces on this planet cannot use SUSTAIN DAMAGE");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
