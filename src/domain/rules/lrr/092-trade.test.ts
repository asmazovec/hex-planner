/** LRR 92 Trade (Strategy Card). Source: tirules2 rules-reference/trade.md. */
import { describe, expect, test } from 'vitest';
import { gameAs, opponentsBySeat } from '../../players';
import { CARD } from '../../strategy';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';
import { holding, ofRival, RIVAL } from './kit-83-101';

const pack = rulesPack();
const SECOND_RIVAL = { ...RIVAL, id: 'o2', seat: 3, color: 3 };

describe('LRR 92 Trade (Strategy Card)', () => {
  test('92.1: the holder of Trade resolves its primary without spending a token', () => {
    const play = primary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.trade);
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test('92.2: the primary gains three trade goods', () => {
    expect(forecast(rulesGame({ entries: [primary(CARD.trade)] }), pack).state.tradeGoods).toBe(3);
  });

  test.todo('92.3: the primary replenishes commodities up to the faction\'s value — not modelled: commodities are not kept in the state');
  test.todo('92.3.1: commodities never exceed the faction\'s value — not modelled: commodities are not kept in the state');

  test('92.4: a player chosen by the primary resolves the secondary without spending a token', () => {
    // The opponent's free secondary is recorded on my primary; my own state is what the test can see.
    const play = secondary(CARD.trade);
    expect(forecast(rulesGame({ entries: [play] }), pack).state.strategy).toBe(1);
  });

  test('92.4: a rival chosen on my Trade primary spends no strategy token on its secondary', () => {
    const mine = primary(CARD.trade, { freeSecondary: [RIVAL.id] });
    const theirs = ofRival(secondary(CARD.trade));
    const game = holding(rulesGame({ entries: [mine, theirs], game: { opponents: [RIVAL] } }), CARD.trade);
    expect(forecast(game, pack).state.rivals?.[RIVAL.id].strategy).toBe(2);
    expect(codesOf(game, pack, theirs)).toEqual([]);
  });

  test('92.4: on a rival\'s Trade primary the players to choose are the others: never that rival himself', () => {
    // The editor of a rival's card lists opponentsBySeat of the game seen as that rival.
    const game = rulesGame({ game: { opponents: [RIVAL, SECOND_RIVAL] } });
    expect(opponentsBySeat(gameAs(game, RIVAL.id)).map(o => o.id)).not.toContain(RIVAL.id);
  });

  test.todo('92.4.1: the chosen players must resolve the secondary right after the primary — not modelled: other players\' secondaries are planned by hand');

  test('92.4.2: a player chosen by the primary uses the secondary once and cannot use it again for a token', () => {
    const mine = primary(CARD.trade, { freeSecondary: [RIVAL.id] });
    const again = ofRival(secondary(CARD.trade));
    const game = holding(rulesGame({ entries: [mine, ofRival(secondary(CARD.trade)), again], game: { opponents: [RIVAL] } }), CARD.trade);
    expect(codesOf(game, pack, again)).not.toEqual([]);
  });

  test('92.5: the secondary of another player\'s Trade spends a token from the strategy pool', () => {
    const play = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.imperial);
    expect(forecast(game, pack).state.strategy).toBe(1);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test.todo('92.5: the secondary replenishes commodities — not modelled: commodities are not kept in the state');
  test.todo('92 note 1: the order of the steps and deals around them — not modelled: deals and the order of other players are not tracked');
  test.todo('92 note 2: replenishing at the maximum still triggers replenish effects — not modelled: commodities are not kept in the state');
});
