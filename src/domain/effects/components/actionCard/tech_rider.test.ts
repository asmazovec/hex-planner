import { describe, expect, test } from 'vitest';
import type { StartHoldings } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './tech_rider';

const GRAVITY_DRIVE = 'technology:gd';

/** Technology Rider in the agenda phase; a correct prediction is entered as the technology researched. */
const rider = (choices: Record<string, string> = {}) => componentAction(id, { phase: 'agenda', choices });
const table = (play: ReturnType<typeof rider>, start: StartHoldings = {}) =>
  bench({ faction: 'sol', start: { hand: [id], ...start }, entries: [play] });

describe('actionCard:tech_rider Technology Rider', () => {
  // "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your
  //  prediction is correct, research 1 technology."
  // Checks: the prediction came true and Gravity Drive is entered: it joins my technologies.
  // Why the check is redundant here: nothing is lifted; the plan counts no votes, so the player enters the result,
  // and the technology then counts for movement and prerequisites as any researched one.
  test('actionCard:tech_rider with a correct prediction researches the technology entered', () => {
    const rides = table(rider({ technology: GRAVITY_DRIVE }));
    quote(rides.pack, id, 'If your prediction is correct, research 1 technology.');
    expect(endOf(rides).holdings.technologies).toContain(GRAVITY_DRIVE);
  });

  // Window "After an agenda is revealed"; LRR 2.6: only an "ACTION" card is played as a component action.
  // Checks: played in the agenda phase it is no action outside the action phase.
  // Why the check is redundant here: a rider is played in the agenda phase by its own window.
  test('actionCard:tech_rider in the agenda phase is not an action outside the action phase', () => {
    const play = rider({ technology: GRAVITY_DRIVE });
    expectNone(warningsOf(table(play), play), 'actionOutsidePhase');
  });

  // Checks: without a technology entered (the prediction failed) nothing is researched; the card is still discarded.
  // Why the check is NOT redundant here: the card researches only on a correct prediction.
  test('actionCard:tech_rider with a wrong prediction researches nothing and is discarded', () => {
    const end = endOf(table(rider()));
    expect(end.holdings.technologies).toEqual([]);
    expect(end.holdings.hand).not.toContain(id);
  });

  // LRR 90.10: a player cannot research a technology they already own.
  // Checks: a technology I already own, entered for the rider, is warned of.
  // Why the check is NOT redundant here: the rider researches as research does; it does not allow a second copy.
  test('actionCard:tech_rider researching a technology I own is warned of', () => {
    const play = rider({ technology: GRAVITY_DRIVE });
    expectStanding(warningsOf(table(play, { technologies: [GRAVITY_DRIVE] }), play), 'researchOwned');
  });

  test('actionCard:tech_rider is a play effect', () => {
    expect(effect(table(rider()).pack, id).tier).toBe('play');
  });
});
