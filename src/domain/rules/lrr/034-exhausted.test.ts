/** LRR 34 Exhausted. Source: tirules2 rules-reference/exhausted.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Entry } from '../../types';
import { adjust, before, codesOf, forecast, HOME, primary, rulesGame, rulesPack, statusTokens, tactical, TARGET } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };
const inPhase = (entry: Entry, phase: Entry['phase']): Entry => ({ ...entry, phase });

describe('LRR 34 Exhausted', () => {
  test.todo('34.1: a card is exhausted by turning it face down — not modelled: physical cards');

  test('34.2 / 71.5 / 81.6: exhausted planets are readied in the status phase, for the next round', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const next = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ rounds: [[spend], [next]], game: atHome });
    expect(codesOf(game, pack, next)).not.toContain('planetExhausted');
  });

  test('34.2: the status phase readies the planets spent in the action phase, so the agenda phase of that round finds them ready', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const agenda = adjust({}, 'agenda');
    const game = rulesGame({ entries: [spend, statusTokens(1, 1, 0), agenda], game: atHome });
    expect(before(game, pack, agenda).exhausted).toEqual([]);
  });

  test('34.2: an agenda-phase entry paying with a planet spent in the action phase is not warned about', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const vote = inPhase(tactical(TARGET, { payment: { planets: ['h1'], tradeGoods: 0 } }, {}), 'agenda');
    const game = rulesGame({ entries: [spend, vote], game: atHome });
    expect(codesOf(game, pack, vote)).not.toContain('planetExhausted');
  });

  test('34.3: spending a planet\'s resources exhausts it', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(forecast(rulesGame({ entries: [spend], game: atHome }), pack).state.exhausted).toEqual(['h1']);
  });

  test('34.3: spending a planet\'s influence exhausts it', () => {
    const play = primary(CARD.leadership, { tokens: { tactic: 4 }, boughtTokens: 1, payment: { planets: ['h2', 'h1'], tradeGoods: 0 } });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.exhausted).toEqual(['h2', 'h1']);
  });

  test('34.4 / 71.4: an exhausted planet cannot be spent again', () => {
    const second = tactical(TARGET, { production: {}, payment: { planets: ['h1'], tradeGoods: 0 } });
    const first = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [first, second], game: atHome }), pack, second)).toContain('planetExhausted');
  });

  test('34.4: a planet spent twice in one payment is exhausted once and counted once', () => {
    const build = tactical(HOME, { production: { dreadnought: 1 }, payment: { planets: ['h1', 'h1'], tradeGoods: 0 } });
    const codes = codesOf(rulesGame({ entries: [build], game: atHome }), pack, build);
    expect(codes).toContain('planetExhausted');
    expect(codes).toContain('shortResources');
  });

  test.todo('34.4.1: passive abilities of an exhausted card still apply — not modelled: card abilities are not in the data');

  test('34.5: a strategy card is exhausted after its strategic action, so its primary cannot be played again that round', () => {
    const again = primary(CARD.trade);
    const game = rulesGame({ playerCount: 4, entries: [primary(CARD.trade), again] });
    expect(codesOf(game, pack, again)).toContain('primaryRepeated');
  });

  test('34 note 1: planets spent in the agenda phase are ready again in the next round', () => {
    const vote = inPhase(tactical(TARGET, { payment: { planets: ['h1'], tradeGoods: 0 } }), 'agenda');
    const next = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ rounds: [[vote], [next]], game: atHome });
    expect(codesOf(game, pack, next)).not.toContain('planetExhausted');
  });

  test('34 note 2: a planet exhausted to pay must be one the player controls', () => {
    // h1 covers the cruiser alone; t1, which is not mine, is listed as well.
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1', 't1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [build], game: atHome }), pack, build)).toContain('planetNotControlled');
  });
});
