import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, FAR, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './dd2';

describe('technology:dd2 Destroyer II', () => {
  // "Cost 1, Combat 8, Move 2"
  // Checks: the upgrade changes no number the plan counts: move 2, cost 1 and no capacity, as Destroyer I.
  // Why nothing is validated anew: combat and ANTI-FIGHTER BARRAGE are rolls, which the plan does not make.
  test('technology:dd2 changes no number of the count', () => {
    const { pack } = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(pack, id, 'ANTI-FIGHTER BARRAGE 6(x3)');
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.waive).toBeUndefined();
    expect(found.modify?.speed?.(2, { faction: 'hacan', unit: 'destroyer' })).toBe(2);
    expect(found.modify?.unitCost?.(1, { faction: 'hacan', unit: 'destroyer' })).toBe(1);
    expect(found.modify?.capacity?.(0, { faction: 'hacan', unit: 'destroyer' })).toBe(0);
  });

  // "Move 2"
  // Checks: a Destroyer II still falls short of a system three away.
  // Why the check is NOT redundant here: the upgrade keeps the move of 2.
  test('technology:dd2 a Destroyer II still falls short of a system three away', () => {
    const move = tactical(FAR, { moves: [{ from: HOME, units: { destroyer: 1 }, via: [NEAR, TARGET] }] });
    const table = bench({ faction: 'hacan', units: { [HOME]: { destroyer: 1 } }, start: { technologies: [id] }, entries: [move] });
    expectStanding(warningsOf(table, move), 'speedShort');
  });
});
