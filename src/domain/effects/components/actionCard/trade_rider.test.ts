import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectNone, quote, warningsOf } from '../kit';
import { id } from './trade_rider';

/** Trade Rider in the agenda phase; `correct: 1` marks a prediction that came true. */
const rider = (choices: Record<string, number> = {}) => componentAction(id, { phase: 'agenda', choices });
const table = (play: ReturnType<typeof rider>) => bench({ faction: 'sol', start: { hand: [id] }, entries: [play] });

describe('actionCard:trade_rider Trade Rider', () => {
  // "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your
  //  prediction is correct, gain 5 trade goods."
  // Checks: a correct prediction gives me five trade goods.
  // Why the check is redundant here: nothing is lifted; the plan counts no votes, so the player marks the result.
  test('actionCard:trade_rider with a correct prediction gains five trade goods', () => {
    const rides = table(rider({ correct: 1 }));
    quote(rides.pack, id, 'If your prediction is correct, gain 5 trade goods.');
    expect(endOf(rides).tradeGoods).toBe(5);
  });

  // Window "After an agenda is revealed"; LRR 2.6: only an "ACTION" card is played as a component action.
  // Checks: played in the agenda phase it is no action outside the action phase.
  // Why the check is redundant here: a rider is played in the agenda phase by its own window.
  test('actionCard:trade_rider in the agenda phase is not an action outside the action phase', () => {
    const play = rider({ correct: 1 });
    expectNone(warningsOf(table(play), play), 'actionOutsidePhase');
  });

  // Checks: a wrong prediction gives nothing; the card is still discarded.
  // Why the check is NOT redundant here: the trade goods come only with a correct prediction.
  test('actionCard:trade_rider with a wrong prediction gains nothing and is discarded', () => {
    const end = endOf(table(rider()));
    expect(end.tradeGoods).toBe(0);
    expect(end.holdings.hand).not.toContain(id);
  });

  test('actionCard:trade_rider is a play effect', () => {
    expect(effect(table(rider()).pack, id).tier).toBe('play');
  });
});
