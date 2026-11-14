/** LRR 40 Game Round. Source: tirules2 rules-reference/game-round.md. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../testing/old/domain/types';
import { adjust, before, codesOf, HOME, NEAR, rulesGame, rulesPack, statusTokens, tactical } from '../kit';

const pack = rulesPack();
const inPhase = (entry: Entry, phase: Entry['phase']): Entry => ({ ...entry, phase });

describe('LRR 40 Game Round', () => {
  test('40 (intro): the strategy phase comes before the action phase, whatever the order of the list', () => {
    const move = tactical(NEAR);
    const game = rulesGame({ entries: [move, adjust({ tactic: 1 }, 'strategy')] });
    expect(before(game, pack, move).tactic).toBe(4);
  });

  test('40 (intro): the status phase comes after the action phase, whatever the order of the list', () => {
    const move = tactical(NEAR);
    const game = rulesGame({ entries: [statusTokens(1, 0, 0), move] });
    expect(before(game, pack, move).tactic).toBe(3);
  });

  test('40 (intro): the status phase comes before the agenda phase: the command tokens of the action phase are off the board by then', () => {
    const agenda = adjust({}, 'agenda');
    const game = rulesGame({ entries: [tactical(NEAR), statusTokens(1, 1, 0), agenda] });
    expect(before(game, pack, agenda).tokensOnMap).toEqual([]);
  });

  test('40 (intro): the status phase comes before the agenda phase: planets spent in the action phase are ready by then', () => {
    const agenda = adjust({}, 'agenda');
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [spend, statusTokens(1, 1, 0), agenda], game: { docks: ['h1'] } });
    expect(before(game, pack, agenda).exhausted).toEqual([]);
  });

  test('40 (intro): a new round begins with no command tokens on the board and every planet ready', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const next = adjust({}, 'strategy');
    const game = rulesGame({ rounds: [[spend], [next]], game: { docks: ['h1'] } });
    const state = before(game, pack, next);
    expect(state.tokensOnMap).toEqual([]);
    expect(state.exhausted).toEqual([]);
  });

  test.todo('40.1: the agenda phase is skipped until the custodians token is removed — not modelled: the custodians token is not tracked, the agenda phase is always offered');

  test('40.2: turns, so tactical actions, happen in the action phase: one placed in another phase is warned about', () => {
    const misplaced = inPhase(tactical(NEAR), 'status');
    expect(codesOf(rulesGame({ entries: [misplaced] }), pack, misplaced)).toContain('actionOutsidePhase');
  });

  test.todo('40.3: effects lasting until the end of a turn end with that turn — not modelled: turn-long effects are not planned');
  test.todo('40 note 1: the strategy, status and agenda phases have no turns for game effects — not modelled: turn-long effects are not planned');
  test.todo('40 note 2: a game has at most nine rounds — not modelled: the plan does not cap its rounds');
});
