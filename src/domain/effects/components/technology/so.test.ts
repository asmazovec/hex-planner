import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './so';

describe('technology:so Salvage Operations', () => {
  // "After you win or lose a space combat, gain 1 trade good"
  // Checks: the component is a hint shown in the block of the combat step, and lifts nothing.
  // Why nothing is validated here: who wins a space combat and which ships were destroyed are outcomes the plan does not simulate; the trade good and the ship produced are entered by hand.
  test('technology:so is a hint at the combat step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak' });
    quote(pack, id, "After you win or lose a space combat, gain 1 trade good");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
