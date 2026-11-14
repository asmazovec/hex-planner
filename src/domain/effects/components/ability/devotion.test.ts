import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './devotion';

describe('ability:devotion Devotion', () => {
  // "After each space combat round: You may destroy 1 of your cruisers or destroyers in the active system to produce 1
  //  hit and assign it to 1 of your opponent's ships in that system."
  // Checks: the ability is a reminder of the combat step only.
  // Why nothing is validated here: it acts between rounds of a space combat, and the plan rolls no dice and assigns no
  // hits; the cruiser or destroyer destroyed is entered as a loss of the action (`losses`), as any other loss is.
  test('ability:devotion is a hint of combat', () => {
    const { pack } = bench({ faction: 'yin' });
    quote(pack, id, 'You may destroy 1 of your cruisers or destroyers in the active system to produce 1 hit');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
