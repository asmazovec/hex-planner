/** LRR 93 Trade Goods. Source: tirules2 rules-reference, the trade goods page. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Entry } from '../../../testing/old/domain/types';
import { adjust, codesOf, forecast, HOME, NO_PAYMENT, primary, rulesGame, rulesPack, secondary, tactical } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };

describe('LRR 93 Trade Goods', () => {
  test.todo('93.1: trade goods and commodities are two sides of one token — not modelled: commodities are not kept in the state');

  test('93.2: gained trade goods go to the player\'s trade good area and stay there', () => {
    const game = rulesGame({ rounds: [[primary(CARD.trade)], [adjust({ tradeGoods: 1 })]] });
    expect(forecast(game, pack).state.tradeGoods).toBe(4);
  });

  test('93.3: trade goods can be spent in any phase, also on a strategy card', () => {
    const play = secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: [], tradeGoods: 4 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 4 }, 'strategy'), play] });
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(0);
  });

  test('93.4: spending trade goods the player does not have is warned about', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 2 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('shortTradeGoods');
  });

  test('93.4.1 / 75.3: a trade good is spent as one resource', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 2 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 2 }, 'strategy'), build], game: atHome });
    expect(codesOf(game, pack, build)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(0);
  });

  test('93.4.2: a trade good is spent as one influence', () => {
    const play = secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: [], tradeGoods: 3 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }, 'strategy'), play] });
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test.todo('93.4.2: trade goods cannot cast votes — not modelled: the agenda phase is not planned');

  test('93.4.3: an effect that asks for trade goods is paid in trade goods only', () => {
    const slice = { id: 'x1', phase: 'action', status: 'planned', type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: 'tg3', payment: { planets: ['h1'], tradeGoods: 0 } }] } as Entry;
    const game = rulesGame({ entries: [slice], game: { expansions: ['te'] } });
    expect(codesOf(game, pack, slice)).toContain('shortTradeGoods');
    const paid = { ...slice, id: 'x2', acts: [{ kind: 'expedition', sliceId: 'tg3', payment: NO_PAYMENT }] } as Entry;
    const rich = rulesGame({ entries: [adjust({ tradeGoods: 3 }, 'strategy'), paid], game: { expansions: ['te'] } });
    expect(codesOf(rich, pack, paid)).toEqual([]);
    expect(forecast(rich, pack).state.tradeGoods).toBe(0);
  });

  test.todo('93.5: trade goods change hands in transactions — not modelled: transactions are entered as adjustments');
  test.todo('93.6: a commodity received becomes a trade good — not modelled: commodities are not kept in the state');
  test.todo('93.6.1: such a token is a trade good from then on — not modelled: commodities are not kept in the state');
  test.todo('93.7: tokens of one and three are swapped freely — not modelled: trade goods are one number');
});
