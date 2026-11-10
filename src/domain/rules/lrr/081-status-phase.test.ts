/** LRR 81 Status Phase. Source: tirules2 rules-reference/status-phase.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import type { Entry } from '../../types';
import { adjust, before, codesOf, forecast, HOME, primary, rulesGame, rulesPack, statusTokens, tactical, TARGET } from '../kit';

const pack = rulesPack();
const atHome = { docks: ['h1'] };

describe('LRR 81 Status Phase', () => {
  test('81.1: points scored in the status phase are added to the player\'s victory points', () => {
    const status = { ...statusTokens(1, 1, 0), vp: 1 } as ReturnType<typeof statusTokens>;
    expect(forecast(rulesGame({ entries: [status] }), pack).state.vp).toBe(1);
  });

  test.todo('81.1: at most one public and one secret objective a status phase — not modelled: points are one number, public and secret are not told apart');
  test.todo('81.2: the speaker reveals a public objective — not modelled: objectives are not tracked');
  test.todo('81.2.1: no Stage II before every Stage I is revealed — not modelled: objectives are not tracked');
  test.todo('81.2.2: the game ends with no public objective left to reveal — not modelled: objectives are not tracked');
  test.todo('81.3: each player draws one action card — not modelled: action cards are not tracked');

  test('81.4: tokens on the board return at the end of the round, so the system can be activated again', () => {
    const again = tactical(TARGET);
    const game = rulesGame({ rounds: [[tactical(TARGET)], [again]] });
    const { state } = forecast(game, pack);
    expect(state.tokensOnMap).toEqual([TARGET]);
    expect(codesOf(game, pack, again)).not.toContain('systemHasToken');
  });

  test('81.4: the tokens leave the board in the status phase itself: after it, nothing of mine is on the board', () => {
    const later = adjust({}, 'agenda');
    const game = rulesGame({ entries: [tactical(TARGET), statusTokens(1, 1, 0), later] });
    expect(before(game, pack, later).tokensOnMap).toEqual([]);
  });

  test('81.5: each player gains two command tokens', () => {
    const { state } = forecast(rulesGame({ entries: [statusTokens(1, 1, 0)] }), pack);
    expect(state.tactic + state.fleet + state.strategy).toBe(10);
  });

  test('81.5: gaining more than two is warned about', () => {
    const status = statusTokens(2, 1, 0);
    expect(codesOf(rulesGame({ entries: [status] }), pack, status)).toContain('tokensOver');
  });

  test('81.5: the tokens on the sheet can be redistributed among the pools', () => {
    const status = statusTokens(4, -1, -1);
    const game = rulesGame({ entries: [status] });
    const { state } = forecast(game, pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([7, 2, 1]);
    expect(codesOf(game, pack, status)).not.toContain('tokensOver');
  });

  test('81.5: redistribution cannot take more from a pool than it holds', () => {
    const status = statusTokens(6, -1, -3);
    expect(codesOf(rulesGame({ entries: [status] }), pack, status)).toContain('poolNegative');
  });

  test('81.5: the tokens returned from the board are not gained again: only two come in', () => {
    const status = statusTokens(1, 1, 0);
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET), tactical(HOME), status] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([2, 4, 2]);
  });

  test('81.5.1: after shrinking the fleet pool, too many ships in a system are warned about', () => {
    const status = statusTokens(3, -1, 0);
    const game = rulesGame({ units: { [HOME]: { cruiser: 3 } }, entries: [status] });
    expect(codesOf(game, pack, status)).toContain('fleetPool');
  });

  test.todo('81.5.2: a timing conflict in this step resolves in initiative order — not modelled: other players\' status steps are not planned');

  test('81.6: every exhausted card is readied: after the status phase no planet is exhausted', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const later = adjust({}, 'agenda');
    const game = rulesGame({ entries: [spend, statusTokens(1, 1, 0), later], game: atHome });
    expect(before(game, pack, later).exhausted).toEqual([]);
  });

  test('81.6: every exhausted card is readied: an agent and a technology exhausted in the action phase are ready after it', () => {
    const use = (id: string, componentId: string): Entry => ({ id, phase: 'action', status: 'planned', type: 'component', note: '', componentId });
    const start = { me: { technologies: ['technology:gls'], leaders: { 'leader:solagent': 'unlocked' as const } }, opponents: {} };
    const game = rulesGame({ entries: [use('a', 'technology:gls'), use('b', 'leader:solagent'), statusTokens(1, 1, 0)], game: { start } });
    const { holdings } = forecast(game, loadPack(['pok'])).state;
    expect(holdings.exhausted).toEqual([]);
    expect(holdings.leaders).toEqual({ 'leader:solagent': 'unlocked' });
  });

  test('81.6: the readied planets pay in the next round', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const next = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ rounds: [[spend, statusTokens(1, 1, 0)], [next]], game: atHome }), pack, next)).not.toContain('planetExhausted');
  });

  test.todo('81.7: damaged units are repaired — not modelled: damage is not tracked');

  test('81.8: strategy cards go back: the same card can be played again next round', () => {
    const again = primary(CARD.trade);
    expect(codesOf(rulesGame({ rounds: [[primary(CARD.trade), statusTokens(1, 1, 0)], [again]] }), pack, again)).not.toContain('primaryRepeated');
  });

  test.todo('81.8: with the custodians token removed, the agenda phase follows — not modelled: the agenda phase is not planned');
  test.todo('81 note 1: no public objective without control of every home planet — not modelled: points are one number, public and secret are not told apart');
  test.todo('81 note 2: a short action card deck is dealt lowest initiative first — not modelled: action cards are not tracked');
  test.todo('81 note 3: every damaged unit is repaired — not modelled: damage is not tracked');
});
