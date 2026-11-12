import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './mentakhero';

describe('leader:mentakhero Ipswitch, Loose Cannon', () => {
  // "for each other player's ship that is destroyed during this combat, place 1 ship of that type"
  // Checks: the component is a hint shown in the block of the combat step, and lifts nothing.
  // Why nothing is validated here: the ships placed depend on what is destroyed in a combat the plan does not simulate; they are entered by hand.
  test('leader:mentakhero is a hint at the combat step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak', expansions: ['pok'] });
    quote(pack, id, "for each other player's ship that is destroyed during this combat, place 1 ship of that type");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
