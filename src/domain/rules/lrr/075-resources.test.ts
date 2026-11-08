/** LRR 75 Resources. Source: tirules2 rules-reference/resources.md. */
import { describe, expect, test } from 'vitest';
import { readyResources } from '../../project';
import { adjust, codesOf, forecast, HOME, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };

describe('LRR 75 Resources', () => {
  test('75.1: a planet\'s resources are its resource value, not its influence: t2 (1/3) pays 1 resource', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['t2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: { ...atHome, planetControl: { t2: 'me' } } });
    expect(codesOf(game, pack, build)).toContain('shortResources');
  });

  test('75.2: a planet\'s resources are spent by exhausting it', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(forecast(rulesGame({ entries: [build], game: atHome }), pack).state.exhausted).toEqual(['h1']);
  });

  test('75.2: only the planets named in the payment are exhausted', () => {
    const build = tactical(HOME, { production: { destroyer: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const { state } = forecast(rulesGame({ entries: [build], game: atHome }), pack);
    expect(state.exhausted).toEqual(['h2']);
    expect(readyResources(state, pack)).toBe(3);
  });

  test('75.3: a trade good is spent as one resource', () => {
    const build = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 1 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 1 }, 'strategy'), build], game: atHome });
    expect(codesOf(game, pack, build)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(0);
  });
});
