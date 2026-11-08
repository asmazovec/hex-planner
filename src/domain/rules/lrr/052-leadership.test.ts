/** LRR 52 Leadership (Strategy Card). Source: tirules2 rules-reference/leadership.md. */
import { describe, expect, test } from 'vitest';
import { CARD, cardCost, costsStrategyToken, withLeadershipTokens } from '../../strategy';
import type { Entry } from '../../types';
import { adjust, codesOf, FACTION, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();
const card = (e: Entry) => e as Extract<Entry, { type: 'strategic' | 'secondary' }>;

describe('LRR 52 Leadership', () => {
  test('52 (intro): the Leadership card has initiative 1', () => {
    expect(CARD.leadership).toBe(1);
  });

  test('52.1: the primary of one\'s own Leadership card costs no strategy token', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 3 } });
    expect(costsStrategyToken(card(play))).toBe(false);
    expect(forecast(rulesGame({ entries: [play] }), pack).state.strategy).toBe(2);
  });

  test('52.2: the primary gains three command tokens', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 3 } });
    const game = rulesGame({ entries: [play] });
    expect(forecast(game, pack).state.tactic).toBe(6);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('52.2: distributing more than three free tokens without buying them is warned about', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 4 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('tokensOver');
  });

  test('52.2: then one more token for every three influence spent', () => {
    // h1 + h2 give 3 influence.
    const play = primary(CARD.leadership, { tokens: { tactic: 4 }, boughtTokens: 1, payment: { planets: ['h2', 'h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toEqual([]);
  });

  test('52.2: tokens tapped beyond the three free ones are bought, at three influence each', () => {
    const effects = withLeadershipTokens({}, { tactic: 2, fleet: 2, strategy: 1 }, true);
    expect(effects.boughtTokens).toBe(2);
    expect(cardCost(card(primary(CARD.leadership, effects)), FACTION, [], pack)).toEqual({ kind: 'influence', amount: 6 });
  });

  test('52.2: bought tokens not paid for in full are warned about', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 5 }, boughtTokens: 2, payment: { planets: ['h2', 'h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('shortInfluence');
  });

  test('52.3: the secondary gains a token for every three influence, and costs no strategy token', () => {
    const play = secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: ['h2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [play] });
    expect(codesOf(game, pack, play)).toContain('shortInfluence');
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test('52.3: the secondary gives no free token: every tapped token is bought', () => {
    expect(withLeadershipTokens({}, { fleet: 2 }, false).boughtTokens).toBe(2);
    const play = secondary(CARD.leadership, { tokens: { fleet: 1 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('tokensOver');
  });

  test('52.4: the gained tokens go to the pools the player chooses', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 1, fleet: 1, strategy: 1 } });
    const { state } = forecast(rulesGame({ entries: [play] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([4, 4, 3]);
  });

  test('52 note 1: the secondary needs no strategy token, even with none left', () => {
    const play = secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: ['h2', 'h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [adjust({ strategy: -2 }, 'strategy'), play] });
    expect(codesOf(game, pack, play)).not.toContain('shortStrategy');
    expect(forecast(game, pack).state.strategy).toBe(0);
  });

  test('52 note 2: influence spent beyond what the tokens need is wasted, with no warning', () => {
    // h2 + t2 give 5 influence for one token of 3.
    const play = secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: ['t2', 'h2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [play], game: { planetControl: { t2: 'me' } } });
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.fleet).toBe(4);
  });
});
