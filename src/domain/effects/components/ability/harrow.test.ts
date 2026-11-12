import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './harrow';

describe('ability:harrow Harrow', () => {
  // "may use their BOMBARDMENT abilities against your opponent's ground forces on the planet"
  // Checks: the component is a hint shown in the block of the invasion step, and lifts nothing.
  // Why nothing is validated here: the ability adds rolls of BOMBARDMENT at the end of each round of ground combat; the plan rolls no dice and fights no ground combat (the losses are entered by hand), so there is no number to change and no check to lift.
  test('ability:harrow is a hint at the invasion step and waives nothing', () => {
    const { pack } = bench({ faction: 'l1z1x' });
    quote(pack, id, "may use their BOMBARDMENT abilities against your opponent's ground forces on the planet");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
