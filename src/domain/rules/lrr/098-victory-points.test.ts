/** LRR 98 Victory Points. Source: tirules2 rules-reference/victory-points.md. */
import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../testing/old/domain/types';
import { adjust, forecast, rulesGame, rulesPack, statusTokens } from '../kit';
import { RIVAL } from './kit-83-101';

const pack = rulesPack();
const scoring = (vp: number, opponentVp?: Record<string, number>): Entry => ({ ...statusTokens(0, 0, 0), vp, opponentVp } as Entry);

describe('LRR 98 Victory Points', () => {
  test('98.1: points scored in the status phase are gained', () => {
    expect(forecast(rulesGame({ entries: [scoring(1)] }), pack).state.vp).toBe(1);
  });

  test('98.2: each player\'s points are kept, mine and every opponent\'s', () => {
    const game = rulesGame({ entries: [scoring(1, { [RIVAL.id]: 2 })], game: { opponents: [RIVAL] } });
    const { state } = forecast(game, pack);
    expect([state.vp, state.opponentVp[RIVAL.id]]).toEqual([1, 2]);
  });

  test.todo('98.2.1: the 14-point side of the track — not modelled: the app keeps no victory target');

  test('98.3: every player starts at zero points', () => {
    expect(forecast(rulesGame(), pack).state.vp).toBe(0);
  });

  test('98.4: gained points add to the points already held, round after round', () => {
    const game = rulesGame({ rounds: [[scoring(1)], [scoring(2), adjust({ vp: 1 })]], game: { vp: 3 } });
    expect(forecast(game, pack).state.vp).toBe(7);
  });

  test.todo('98.4.1: a player cannot hold more than 10 points — not modelled: the app keeps no victory target (10 or 14) and no end of game');
  test.todo('98.5: ties for most or fewest points all count — not modelled: effects by points are not resolved');
  test.todo('98.6: a point from a discarded law stays — not modelled: laws are not tracked');
  test.todo('98.7: the game ends at once at 10 points; initiative breaks a tie — not modelled: no end of game');
  test.todo('98.8: when no objective can be revealed the most points win — not modelled: objectives are not tracked');
});
