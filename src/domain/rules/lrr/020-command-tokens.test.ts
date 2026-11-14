/** LRR 20 Command Tokens. Source: tirules2 rules-reference/command-tokens.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Game } from '../../../testing/old/domain/types';
import { adjust, codesOf, FAR, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, statusTokens, tactical, TARGET } from '../kit';

const pack = rulesPack();

/** The cards I hold in the first round. */
function holding(game: Game, strategyCard: number): Game {
  game.plans[0].rounds[0].strategyCard = strategyCard;
  return game;
}

describe('LRR 20 Command Tokens', () => {
  test('20.1: a player begins with 3 tokens in the tactic pool, 3 in the fleet pool and 2 in the strategy pool', () => {
    const { state } = forecast(rulesGame(), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([3, 3, 2]);
  });

  test.todo('20.1.1: tokens in the strategy and tactic pools lie faction side up — not modelled: pools are counts, the side is print');
  test.todo('20.1.2: tokens in the fleet pool lie ship side up — not modelled: pools are counts, the side is print');

  test('20.2 / 52.4: gained tokens go to the pools the player chooses', () => {
    const card = primary(CARD.leadership, { tokens: { tactic: 0, fleet: 3, strategy: 0 } });
    const { state } = forecast(rulesGame({ entries: [card] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([3, 6, 2]);
  });

  test('20.3: a player has sixteen tokens in all; those on the board are not in reinforcements, so gaining past sixteen is warned about', () => {
    // Three tokens go down on the board and five stay on the sheet: eight in play, eight left in reinforcements.
    const exact = primary(CARD.leadership, { tokens: { tactic: 8 }, boughtTokens: 5, payment: { planets: [], tradeGoods: 15 } });
    const over = primary(CARD.leadership, { tokens: { tactic: 9 }, boughtTokens: 6, payment: { planets: [], tradeGoods: 18 } });
    const board = () => [tactical(NEAR), tactical(TARGET), tactical(FAR), adjust({ tradeGoods: 18 })];
    expect(codesOf(rulesGame({ entries: [...board(), exact] }), pack, exact)).toEqual([]);
    expect(codesOf(rulesGame({ entries: [...board(), over] }), pack, over)).toContain('noReinforcements');
  });

  test('20.3.1: with none left in reinforcements a token cannot be gained, so the status phase gain past sixteen is warned about', () => {
    // 8 + 3 + 2 + 3 = 16 on the sheet before the last gain, nothing on the board in the status phase.
    const last = statusTokens(2, 0, 0);
    const game = rulesGame({ rounds: [
      [primary(CARD.leadership, { tokens: { tactic: 3 } }), statusTokens(2, 0, 0)],
      [primary(CARD.leadership, { tokens: { tactic: 3 } }), last],
    ] });
    expect(codesOf(game, pack, last)).toContain('noReinforcements');
  });

  test.todo('20.3.2: an effect placing a token with none in reinforcements takes it from a pool — not modelled: reinforcements are not counted');

  test('20.4: a tactical action spends a token from the tactic pool and places it in the system', () => {
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET)] }), pack);
    expect(state.tactic).toBe(2);
    expect(state.tokensOnMap).toEqual([TARGET]);
  });

  test('20.4: with no token left in the tactic pool, a tactical action is warned about', () => {
    const fourth = tactical(FAR);
    const game = rulesGame({ entries: [tactical(HOME), tactical(NEAR), tactical(TARGET), fourth] });
    expect(codesOf(game, pack, fourth)).toContain('poolNegative');
  });

  test('20.5: the secondary of another player\'s card spends a token from the strategy pool', () => {
    const { state } = forecast(rulesGame({ entries: [secondary(CARD.trade)] }), pack);
    expect(state.strategy).toBe(1);
  });

  test('20.5: without a token in the strategy pool, a secondary is warned about', () => {
    const third = secondary(CARD.imperial);
    const game = rulesGame({ entries: [secondary(CARD.trade), secondary(CARD.politics), third] });
    expect(codesOf(game, pack, third)).toContain('shortStrategy');
  });

  test('20.5: only the other players resolve a card\'s secondary: the secondary of my own card is warned about', () => {
    const own = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [primary(CARD.trade), own] }), CARD.trade);
    expect(codesOf(game, pack, own)).toContain('ownSecondary');
  });

  test('20.5.1: the secondary of Leadership spends no token', () => {
    const { state } = forecast(rulesGame({ entries: [secondary(CARD.leadership)] }), pack);
    expect(state.strategy).toBe(2);
  });

  test('20.6 / 24.3: a token placed where the player already has one returns to reinforcements, with no warning', () => {
    const construction = secondary(CARD.construction, { systemId: TARGET, structures: [{ kind: 'pds', planetId: 't1' }] });
    const game = rulesGame({ entries: [tactical(TARGET), construction], game: { planetControl: { t1: 'me' } } });
    const { state } = forecast(game, pack);
    expect(state.tokensOnMap.filter(id => id === TARGET)).toHaveLength(1);
    expect(codesOf(game, pack, construction)).not.toContain('systemHasToken');
  });
});
