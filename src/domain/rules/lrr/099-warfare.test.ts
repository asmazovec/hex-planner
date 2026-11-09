/** LRR 99 Warfare (Strategy Card). Source: tirules2 rules-reference/warfare.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { project } from '../../project';
import type { Entry } from '../../types';
import { adjust, codesOf, forecast, HOME, NEAR, NO_PAYMENT, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();

describe('LRR 99 Warfare (Strategy Card)', () => {
  test('99.1: the primary removes one of the player\'s tokens from the board and gains it', () => {
    const play = primary(CARD.warfare, { systemId: TARGET, tokens: { tactic: 1 } });
    const game = rulesGame({ entries: [tactical(TARGET), play] });
    const { state } = forecast(game, pack);
    expect(state.tokensOnMap).toEqual([]);
    expect(state.tactic).toBe(3);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('99.1: a system holding no token of the player gives no token to gain', () => {
    const play = primary(CARD.warfare, { systemId: TARGET, tokens: { tactic: 1 } });
    const game = holding(rulesGame({ entries: [tactical(HOME), play] }), CARD.warfare);
    expect(forecast(game, pack).state.tokensOnMap).toEqual([HOME]);
    expect(codesOf(game, pack, play)).toContain('tokensOver');
  });

  test('99.2: the primary redistributes the tokens on the sheet', () => {
    const play = primary(CARD.warfare, { systemId: TARGET, tokens: { tactic: 3, fleet: -2 } });
    const game = rulesGame({ entries: [tactical(TARGET), play] });
    expect(forecast(game, pack).state.tactic).toBe(5);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('99.2: redistributing gives no more tokens than the one gained', () => {
    const play = primary(CARD.warfare, { systemId: TARGET, tokens: { tactic: 2 } });
    expect(codesOf(rulesGame({ entries: [tactical(TARGET), play] }), pack, play)).toContain('tokensOver');
  });

  test('99.2: redistributing cannot take more tokens from a pool than it holds', () => {
    const play = primary(CARD.warfare, { systemId: TARGET, tokens: { tactic: 5, strategy: -4 } });
    expect(codesOf(rulesGame({ entries: [tactical(TARGET), play] }), pack, play)).toContain('poolNegative');
  });

  test('99.3: the secondary spends a token from the strategy pool', () => {
    const play = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = holding(rulesGame({ entries: [play], game: { docks: ['h1'] } }), CARD.trade);
    expect(forecast(game, pack).state.strategy).toBe(1);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('99.3: the secondary produces in the home system only', () => {
    const play = secondary(CARD.warfare, { production: { systemId: TARGET, units: { cruiser: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [play], game: { docks: ['t1'], planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, play)).not.toEqual([]);
  });

  test('99.3: the secondary needs a space dock in the home system', () => {
    const play = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('noProduction');
  });

  test('99.3: the secondary produces no more than that one dock\'s production value', () => {
    // A dock produces its planet's resources + 2: h1 has 3, so 5 units.
    const play = secondary(CARD.warfare, { production: { systemId: HOME, units: { infantry: 6 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play], game: { docks: ['h1'] } }), pack, play)).toContain('productionOver');
  });

  test('99.3.1: the secondary does not place its token in the home system', () => {
    const play = secondary(CARD.warfare, { production: { systemId: HOME, units: { cruiser: 1 } } });
    const { state } = forecast(rulesGame({ entries: [play], game: { docks: ['h1'] } }), pack);
    expect(state.tokensOnMap).toEqual([]);
    expect(state.systems[HOME]).toEqual({ cruiser: 1 });
  });

  test('99 note 1: with no token on the board the primary may still be played', () => {
    const play = primary(CARD.warfare);
    expect(codesOf(holding(rulesGame({ entries: [play] }), CARD.warfare), pack, play)).toEqual([]);
  });

  test('99 note 1: with no token on the board the primary gains no token', () => {
    const play = primary(CARD.warfare, { tokens: { tactic: 1 } });
    const game = holding(rulesGame({ entries: [play] }), CARD.warfare);
    expect(codesOf(game, pack, play)).toContain('tokensOver');
  });
});

describe("LRR 99 Warfare in Thunder's Edge: the free tactical action is part of the card's strategic action", () => {
  test('it is replayed right after its card, wherever it is stored in the round', () => {
    const play = primary(CARD.warfare);
    const free = { ...tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], free: true, fromCard: play.id }) };
    const after = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [play, after, free], game: { expansions: ['pok', 'te'] } });
    expect(codesOf(game, pack, after)).not.toContain('unitsMissing');
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1 });
  });
});

describe("LRR 99 Warfare in Thunder's Edge: the free action shares the turn of its card", () => {
  test('it counts as done with its card: the present holds its movement once the card is done', () => {
    const play = { ...primary(CARD.warfare), status: 'done' as const };
    const free = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], free: true, fromCard: play.id });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [play, free], game: { expansions: ['pok', 'te'] } });
    expect(project(game, game.plans[0], 'now', pack).state.systems[NEAR]).toEqual({ carrier: 1 });
  });

  test('the acts of the card come after its free action: an expedition does not take what the free action pays with', () => {
    const play = { ...primary(CARD.warfare), acts: [{ kind: 'expedition' as const, sliceId: 'tg3', payment: NO_PAYMENT }] } as Entry;
    const free = tactical(HOME, { production: { fighter: 2 }, payment: { planets: [], tradeGoods: 1 }, free: true, fromCard: play.id });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }, 'strategy'), play, free], game: { expansions: ['pok', 'te'], docks: ['h1'] } });
    expect(codesOf(game, pack, free)).not.toContain('shortTradeGoods');
    expect(codesOf(game, pack, play)).toContain('shortTradeGoods');
  });
});
