import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './inf2';

describe('technology:inf2 Infantry II', () => {
  // "Cost 1(x2), Combat 7"
  // Checks: the upgrade changes no number the plan counts: two infantry still cost one resource.
  // Why nothing is validated anew: combat is a roll, which the plan does not make.
  test('technology:inf2 changes no number of the count', () => {
    const { pack } = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(pack, id, 'Cost 1(x2), Combat 7');
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.modify?.unitCost?.(0.5, { faction: 'hacan', unit: 'infantry' })).toBe(0.5);
  });

  // "After this unit is destroyed, roll 1 die. If the result is 6 or greater, place the unit on this card. At the start
  //  of your next turn, place each unit that is on this card on a planet you control in your home system."
  test.todo('technology:inf2 the destroyed infantry that returns: it hangs on a roll the plan does not make; the player enters it by hand');
});
