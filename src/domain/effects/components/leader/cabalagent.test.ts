import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './cabalagent';

describe('leader:cabalagent The Stillness of Stars', () => {
  // "After another player replenishes commodities: You may exhaust this card to convert their commodities to trade
  //  goods and capture 1 unit from their reinforcements ..."
  // Checks: the agent is a reminder of the strategy cards (Trade replenishes), shown while it is ready.
  // Why nothing is validated here: another player's commodities and the captured units are not counted by the plan.
  test('leader:cabalagent is a hint of the strategy card, shown while the agent is ready', () => {
    const table = bench({ faction: 'cabal', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } } });
    quote(table.pack, id, 'convert their commodities to trade goods');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toEqual(['card']);
    expect(hintsAt(table.pack, endOf(table), 'card', ['me']).map(c => c.id)).toContain(id);
  });

  test.todo('leader:cabalagent converts another player\'s commodities and captures a unit: other players\' replenishing and captured units are not modelled');
});
