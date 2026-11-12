import { describe, expect, test } from 'vitest';
import { unitStats } from '../../../unitStats';
import { bench, effect, quote } from '../kit';
import { id } from './so2';

describe('technology:so2 Spec Ops II', () => {
  // "Cost 1(x2), Combat 6. After this unit is destroyed, roll 1 die. If the result is 5 or greater, place the unit on
  //  this card."
  // Checks: the upgrade is the generated passive effect of a unit upgrade; this file adds no waiver.
  // Why nothing more is validated: the return of a destroyed infantry depends on a die roll, and the plan rolls none;
  // the combat value is not counted either.
  test('technology:so2 is the passive effect of a unit upgrade with no waiver', () => {
    const { pack } = bench({ faction: 'sol', start: { technologies: [id] } });
    quote(pack, id, 'If the result is 5 or greater, place the unit on this card.');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "Cost 1(x2)"
  // Checks: the infantry of the Sol player with Spec Ops II costs one for two (half a resource each), as the generated
  // numbers have it.
  // Why the check is NOT redundant here: the cost is the printed one, counted by the payment of a production.
  test('technology:so2 keeps the cost of one for two infantry', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(unitStats('sol', 'infantry', true, pack)?.cost).toBe(0.5);
  });

  test.todo('technology:so2 a destroyed infantry returns on a 5 or more to a home planet at the start of the next turn: the plan rolls no dice');
});
