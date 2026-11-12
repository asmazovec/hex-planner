import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, before, bench, effect, endOf, NEAR, quote, tactical, using } from '../kit';
import { id } from './laws_order';

/** Two trade goods, then a tactical action of the Keleres that may invoke the ability. */
const keleres = (turn: Entry) => ({ turn, ...bench({ faction: 'keleresm', expansions: ['pok'], entries: [adjust({ tradeGoods: 2 }), turn] }) });
const wealth = (state: { tradeGoods: number; commodities: number }) => state.tradeGoods + state.commodities;

describe('ability:laws_order Law\'s Order', () => {
  // "At the start of any player's turn: You may spend 1 trade good or 1 commodity to treat all laws as blank until the
  //  end of that turn."
  // Checks: named in «Used» of a turn, the ability costs one trade good or commodity.
  // Why the default count does not apply: trade goods are otherwise spent only by a payment (93.3); the ability is a
  // spending of its own, which the plan must count so that what follows is paid from what is left.
  test.fails('ability:laws_order used with a turn costs 1 trade good or commodity', () => {
    const table = keleres(using(tactical(NEAR), id));
    quote(table.pack, id, 'You may spend 1 trade good or 1 commodity to treat all laws as blank until the end of that turn.');
    expect(wealth(endOf(table))).toBe(wealth(before(table.game, table.pack, table.turn)) - 1);
  });

  // Checks: the same turn without the ability spends nothing.
  // Why the check is NOT redundant here: "You may": the cost is paid only when the ability is used.
  test('ability:laws_order not used costs nothing', () => {
    const table = keleres(tactical(NEAR));
    expect(wealth(endOf(table))).toBe(wealth(before(table.game, table.pack, table.turn)));
  });

  test.todo('ability:laws_order the laws are blank for that turn only: no law changes a number of the count or makes a warning yet (laws are asked at fleetLimit and productionValue, and none has an effect file), so there is nothing to blank and nothing to restore');

  test.fails('ability:laws_order is a play effect', () => {
    const { pack } = keleres(tactical(NEAR));
    expect(effect(pack, id).tier).toBe('play');
  });
});
