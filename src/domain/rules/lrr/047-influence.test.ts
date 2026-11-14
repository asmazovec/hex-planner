/** LRR 47 Influence. Source: tirules2 rules-reference/influence.md. */
import { describe, expect, test } from 'vitest';
import { readyInfluence } from '../../../testing/old/domain/project';
import { CARD } from '../../strategy';
import { adjust, codesOf, forecast, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();

/** Leadership's secondary buying one token: it owes 3 influence. */
const buyOne = (payment: { planets: string[]; tradeGoods: number }) =>
  secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment });

describe('LRR 47 Influence', () => {
  test('47.1: a planet gives its influence value: the home planets give 1 and 2', () => {
    expect(readyInfluence(forecast(rulesGame(), pack).state, pack)).toBe(3);
  });

  test('47.2: a planet\'s influence is spent by exhausting it', () => {
    const buy = buyOne({ planets: ['h2', 'h1'], tradeGoods: 0 });
    const game = rulesGame({ entries: [buy] });
    expect(codesOf(game, pack, buy)).toEqual([]);
    expect(forecast(game, pack).state.exhausted).toEqual(expect.arrayContaining(['h1', 'h2']));
  });

  test('47.2: an exhausted planet cannot be spent again', () => {
    const first = buyOne({ planets: ['h2', 'h1'], tradeGoods: 0 });
    const again = buyOne({ planets: ['h2', 'h1'], tradeGoods: 0 });
    const game = rulesGame({ entries: [first, again] });
    expect(codesOf(game, pack, again)).toContain('planetExhausted');
    expect(codesOf(game, pack, again)).toContain('shortInfluence');
  });

  test('47.2: a planet the player does not control gives no influence', () => {
    const buy = buyOne({ planets: ['t2'], tradeGoods: 0 });
    expect(codesOf(rulesGame({ entries: [buy] }), pack, buy)).toContain('shortInfluence');
  });

  test('47.3: a trade good spends as one influence', () => {
    const buy = buyOne({ planets: [], tradeGoods: 3 });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }, 'strategy'), buy] });
    expect(codesOf(game, pack, buy)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(0);
  });

  test('47.3: planets and trade goods add up', () => {
    const buy = buyOne({ planets: ['h2'], tradeGoods: 1 });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 1 }, 'strategy'), buy] });
    expect(codesOf(game, pack, buy)).toEqual([]);
  });

  test.todo('47.3.1: trade goods cannot cast votes — not modelled: the agenda phase is not planned');
});
