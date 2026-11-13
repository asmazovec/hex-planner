import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, planned, quote } from '../kit';
import { id } from './crimsoncommander';

describe('leader:crimsoncommander Ahk Siever', () => {
  // "At the end of a combat between any players: Gain 1 commodity or convert 1 of your commodities to a trade good."
  // Checks: the commander is a reminder in the block of combat.
  // Why nothing is validated: combats are not simulated, the Rebellion need not take part (Ahk Siever note 3), and
  // the end of another player's combat is not an entry of the plan.
  test('leader:crimsoncommander is a reminder of combat', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['pok', 'te'] });
    quote(pack, id, 'Gain 1 commodity or convert 1 of your commodities to a trade good.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
  // The result of the commander is entered by a manual adjustment, which changes commodities as well as trade goods.
  test('leader:crimsoncommander a manual adjustment gains a commodity and converts one to a trade good', () => {
    const gain = planned({ type: 'adjustment', label: 'Ahk Siever', delta: { commodities: 1 } }, 'action');
    expect(endOf(bench({ faction: 'sol', expansions: ['pok'], entries: [gain] })).commodities).toBe(1);
    const convert = planned({ type: 'adjustment', label: 'Ahk Siever', delta: { commodities: -1, tradeGoods: 1 } }, 'action');
    const both = endOf(bench({ faction: 'sol', expansions: ['pok'], entries: [gain, convert] }));
    expect(both.commodities).toBe(0);
    expect(both.tradeGoods).toBe(1);
  });
});
