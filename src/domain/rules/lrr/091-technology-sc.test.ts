/** LRR 91 Technology (Strategy Card). Source: tirules2 rules-reference/technology-sc.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();

describe('LRR 91 Technology (Strategy Card)', () => {
  test('91.1: the holder of Technology resolves its primary as a strategic action, without spending a token', () => {
    const play = primary(CARD.technology, { researched: 1 });
    const game = holding(rulesGame({ entries: [play] }), CARD.technology);
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test('91.2: the primary researches one technology for free', () => {
    const play = primary(CARD.technology, { researched: 1 });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toEqual([]);
  });

  test('91.2: a second technology on the primary costs six resources', () => {
    const play = primary(CARD.technology, { researched: 2, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('shortResources');
  });

  test('91.2: unit upgrades count as researched technologies: two of them on the primary cost six resources', () => {
    const play = primary(CARD.technology, { payment: { planets: ['h1', 'h2'], tradeGoods: 0 } }, { upgrades: ['carrier', 'cruiser'] });
    const game = holding(rulesGame({ entries: [play] }), CARD.technology);
    expect(codesOf(game, pack, play)).toContain('shortResources');
  });

  test('91.2: the primary researches at most two technologies', () => {
    const play = primary(CARD.technology, { researched: 3 });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('researchOverLimit');
  });

  test('91.3: the secondary researches one technology for four resources', () => {
    const play = secondary(CARD.technology, { researched: 1, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toEqual([]);
  });

  test('91.3: the secondary researches only one technology', () => {
    const play = secondary(CARD.technology, { researched: 2, payment: { planets: ['h1', 'h2'], tradeGoods: 4 } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('researchOverLimit');
  });

  test('91.3: the secondary spends a token from the strategy pool and warns without one', () => {
    const play = secondary(CARD.technology, { researched: 1, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.strategy).toBe(1);
    const poor = secondary(CARD.technology, { researched: 1, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [secondary(CARD.trade), secondary(CARD.imperial), poor] });
    expect(codesOf(game, pack, poor)).toContain('shortStrategy');
  });
});
