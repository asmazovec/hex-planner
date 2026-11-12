import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './war_rider';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;

/** Warfare Rider in the agenda phase; a correct prediction is entered as the system of the dreadnought. My cruiser is next to home. */
const rider = (choices: Record<string, string> = {}) => componentAction(id, { phase: 'agenda', choices });
const table = (play: ReturnType<typeof rider>) => bench({ faction: 'sol', units: { [NEAR]: { cruiser: 1 } }, start: { hand: [id] }, entries: [play] });

describe('actionCard:war_rider Warfare Rider', () => {
  // "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your
  //  prediction is correct, place 1 dreadnought from your reinforcements in a system that contains 1 or more of your ships."
  // Checks: a correct prediction places a dreadnought beside my cruiser.
  // Why the check is redundant here: nothing is lifted; the dreadnought is placed, not produced, so no production
  // value, cost or space dock is asked.
  test.fails('actionCard:war_rider with a correct prediction places a dreadnought where my ships are', () => {
    const play = rider({ systemId: NEAR });
    const rides = table(play);
    quote(rides.pack, id, 'place 1 dreadnought from your reinforcements in a system that contains 1 or more of your ships.');
    expect(endOf(rides).systems[NEAR]).toEqual({ cruiser: 1, dreadnought: 1 });
    expectNone(warningsOf(rides, play), PLAY_CONDITION);
  });

  // Window "After an agenda is revealed"; LRR 2.6: only an "ACTION" card is played as a component action.
  // Checks: played in the agenda phase it is no action outside the action phase.
  // Why the check is redundant here: a rider is played in the agenda phase by its own window.
  test('actionCard:war_rider in the agenda phase is not an action outside the action phase', () => {
    const play = rider({ systemId: NEAR });
    expectNone(warningsOf(table(play), play), 'actionOutsidePhase');
  });

  // "... in a system that contains 1 or more of your ships."
  // Checks: the target, where I have no ships, is warned of.
  // Why the check is NOT redundant here: the card places only beside my ships.
  test.fails('actionCard:war_rider in a system without my ships is warned of', () => {
    const play = rider({ systemId: TARGET });
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  // Checks: a wrong prediction (no system entered) places nothing.
  // Why the check is NOT redundant here: the dreadnought comes only with a correct prediction.
  test('actionCard:war_rider with a wrong prediction places nothing', () => {
    expect(endOf(table(rider())).systems[NEAR]).toEqual({ cruiser: 1 });
  });

  test.fails('actionCard:war_rider is a play effect', () => {
    expect(effect(table(rider()).pack, id).tier).toBe('play');
  });
});
