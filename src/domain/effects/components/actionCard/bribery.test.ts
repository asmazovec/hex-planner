import { describe, expect, test } from 'vitest';
import { adjust, bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './bribery';

/** I gain `have` trade goods in the action phase and play Bribery in the agenda phase, spending `spend`. */
const bribe = (have: number, spend: number) => {
  const play = componentAction(id, { phase: 'agenda', choices: { tradeGoods: spend } });
  return { play, ...bench({ faction: 'hacan', start: { hand: [id] }, entries: [adjust({ tradeGoods: have }), play] }) };
};

describe('actionCard:bribery Bribery', () => {
  // "Spend any number of trade goods. For each trade good spent, cast 1 additional vote for the outcome on which you
  //  voted."
  // Checks: with three trade goods I play Bribery for two; one is left at the end of the plan.
  // Why this is counted: the votes are not, but trade goods spent are gone from the player's sheet (LRR 93), and the
  // plan counts trade goods.
  test.fails('actionCard:bribery spends the trade goods chosen', () => {
    const table = bribe(3, 2);
    quote(table.pack, id, 'Spend any number of trade goods.');
    expect(endOf(table).tradeGoods).toBe(1);
  });

  // Checks: two trade goods chosen with only one held is a shortfall of trade goods.
  // Why the check is NOT redundant here: the card spends trade goods the player has; it gives none.
  test.fails('actionCard:bribery spending more trade goods than held is warned of', () => {
    const table = bribe(1, 2);
    expectStanding(warningsOf(table, table.play), 'shortTradeGoods');
  });

  // Ruling (Bribery 2): "A player may spend zero trade goods when they play Bribery."
  // Checks: played for none, the trade goods stay as they were.
  test('actionCard:bribery played for zero trade goods spends none', () => {
    const table = bribe(3, 0);
    expect(endOf(table).tradeGoods).toBe(3);
  });

  test.fails('actionCard:bribery is a play effect', () => {
    const { pack } = bribe(0, 0);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
