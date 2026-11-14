/** LRR 3 Action Phase. Source: tirules2 rules-reference/action-phase.md. My cards of a round are `strategyCard` and `backupCard`. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Entry, Game } from '../../../testing/old/domain/types';
import { before, codesOf, FAR, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, statusTokens, tactical, TARGET } from '../kit';

const pack = rulesPack();

let passes = 0;
const pass = (): Entry => ({ id: `pass${(passes += 1)}`, phase: 'action', status: 'planned', type: 'pass' });

function holding(game: Game, strategyCard: number, backupCard: number | null = null): Game {
  game.plans[0].rounds[0].strategyCard = strategyCard;
  game.plans[0].rounds[0].backupCard = backupCard;
  return game;
}

describe('LRR 3 Action Phase', () => {
  test('3.1: a turn is a strategic, a tactical or a component action: each is an entry of the action phase', () => {
    const component: Entry = { id: 'component', phase: 'action', status: 'planned', type: 'component', note: 'note' };
    const game = holding(rulesGame({ entries: [primary(CARD.trade), tactical(TARGET), component] }), CARD.trade);
    const { state, warnings } = forecast(game, pack);
    expect([state.tactic, state.strategy, state.tradeGoods]).toEqual([2, 2, 3]);
    expect(Object.values(warnings).flat()).toEqual([]);
  });

  test.todo('3.2: a player who cannot perform an action must pass — not modelled: whether an action is possible is not decided');

  test('3.3: after passing a player takes no more actions that phase: an action planned after my pass is warned about', () => {
    const late = tactical(TARGET);
    const game = holding(rulesGame({ entries: [primary(CARD.trade), pass(), late] }), CARD.trade);
    expect(codesOf(game, pack, late)).toContain('actionAfterPass');
  });

  test.todo('3.3.1: on the turn a player passes they can still make transactions and "start of turn" abilities — not modelled: transactions are not');

  test('3.3.2: a player who passed still resolves other players\' secondaries', () => {
    const late = secondary(CARD.imperial);
    const game = holding(rulesGame({ entries: [primary(CARD.trade), pass(), late] }), CARD.trade);
    expect(codesOf(game, pack, late)).toEqual([]);
  });

  test('3.3.3: once the others have passed a player may take several actions in a row', () => {
    const actions = [tactical(NEAR), tactical(TARGET), tactical(FAR)];
    const game = rulesGame({ entries: actions });
    for (const action of actions) expect(codesOf(game, pack, action)).toEqual([]);
  });

  test('3.4: a player cannot pass before the strategic action of their card: such a pass is warned about, a later one is not', () => {
    const early = pass();
    expect(codesOf(holding(rulesGame({ entries: [early, primary(CARD.trade)] }), CARD.trade), pack, early)).toContain('passBeforeStrategy');
    const late = pass();
    expect(codesOf(holding(rulesGame({ entries: [primary(CARD.trade), late] }), CARD.trade), pack, late)).not.toContain('passBeforeStrategy');
  });

  test('3.4.1: with three or four players a player cannot pass before both their cards are exhausted', () => {
    const early = pass();
    const game = holding(rulesGame({ playerCount: 4, entries: [primary(CARD.trade), early] }), CARD.trade, CARD.imperial);
    expect(codesOf(game, pack, early)).toContain('passBeforeStrategy');
  });

  test('3.5: once all have passed the status phase follows: its entries apply after the action phase, wherever they stand in the list', () => {
    const fourth = tactical(HOME);
    const game = rulesGame({ entries: [statusTokens(2, 0, 0), tactical(NEAR), tactical(TARGET), tactical(FAR), fourth] });
    expect(before(game, pack, fourth).tactic).toBe(0);
  });

  test.todo('3 note 1: non-component action cards can still be played after passing — not modelled: action cards are not');
  test.todo('3 note 2: end of action abilities go before end of turn abilities — not modelled: abilities are not resolved');
  test.todo('3 note 3: start and end of turn abilities can be used on the turn a player passes — not modelled: abilities are not resolved');
  test.todo('3 note 4: with all others passed a player keeps resolving start and end of turn abilities — not modelled: abilities are not resolved');
});
