import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ambush';

describe('ability:ambush Ambush', () => {
  // "You may roll 1 die for each of up to 2 of your cruisers or destroyers in the system"
  // Checks: the component is a hint shown in the block of the combat step, and lifts nothing.
  // Why nothing is validated here: the ability rolls dice at the start of a space combat; the plan simulates no combat, the losses are entered by hand.
  test('ability:ambush is a hint at the combat step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak' });
    quote(pack, id, "You may roll 1 die for each of up to 2 of your cruisers or destroyers in the system");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
