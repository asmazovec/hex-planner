/** LRR 21 Commodities. Source: tirules2 rules-reference/commodities.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { forecast, primary, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 21 Commodities', () => {
  test.todo('21.1: commodities and trade goods are two sides of one token — not modelled: the state holds trade goods only');
  test('21.2: every faction sheet carries the commodity value that caps its commodities', () => {
    const factions = Object.values(loadPack([]).factions);
    expect(factions.length).toBeGreaterThan(0);
    for (const faction of factions) expect(faction.commodities).toBeGreaterThan(0);
  });
  test('21.3: replenishing (as the Trade primary does) fills commodities, it adds no trade goods beyond the card\'s own three', () => {
    const state = forecast(rulesGame({ entries: [primary(CARD.trade)] }), pack).state;
    expect(state.tradeGoods).toBe(3);
    expect(state.commodities).toBe(3);
  });
  test.todo('21.4: replenished commodities come from the supply — not modelled: commodities are not counted');
  test.todo('21.5: a commodity received from another player becomes a trade good — not modelled: transactions are not planned');
  test.todo('21.5.1: the received token is a trade good from then on — not modelled: transactions are not planned');
  test.todo('21.5.2: commodities may be traded before a replenish resolves — not modelled: transactions are not planned');
  test.todo('21.5.3: converting one\'s own commodities is not gaining trade goods for other abilities — not modelled: abilities are manual adjustments');
  test.todo('21.6: a commodity given to another player turns into a trade good — not modelled: transactions are not planned');
  test.todo('21.7: commodities cannot be spent, only traded — not modelled: commodities are not counted, so none can be spent');
  test.todo('21.8: commodity tokens of one and three can be swapped — not modelled: physical tokens');
  test('21 note 1: a player starts with no commodities', () => {
    expect(forecast(rulesGame({ entries: [] }), pack).state.commodities).toBe(0);
  });
  test.todo('21 note 2: replenishing at the maximum takes nothing but still triggers replenish effects — not modelled: commodities are not counted');
});
