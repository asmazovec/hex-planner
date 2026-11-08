/** LRR 19 Command Sheet. Source: tirules2 rules-reference/command-sheet.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { adjust, codesOf, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 19 Command Sheet', () => {
  test('19.1: the tactic pool pays for tactical actions, the strategy pool for secondaries, the fleet pool limits ships in a system', () => {
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET), secondary(CARD.trade)] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([2, 3, 1]);
    const crowd = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 4 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 4 } }, entries: [crowd] });
    expect(codesOf(game, pack, crowd)).toContain('fleetPool');
  });

  test('19.2: trade goods can be spent as influence: three of them buy a Leadership token', () => {
    const card = primary(CARD.leadership, { tokens: { tactic: 4 }, boughtTokens: 1, payment: { planets: [], tradeGoods: 3 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }), card] });
    expect(codesOf(game, pack, card)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(0);
  });

  test.todo('19.3: the quick reference may be tucked under the faction sheet — not modelled: print');

  test('19 note 1: a gained token with no pool named may go to any of the three pools', () => {
    const card = primary(CARD.leadership, { tokens: { tactic: 1, fleet: 1, strategy: 1 } });
    const { state } = forecast(rulesGame({ entries: [card] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([4, 4, 3]);
  });
});
