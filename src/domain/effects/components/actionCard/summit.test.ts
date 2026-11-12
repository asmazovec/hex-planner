import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './summit';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;

/** Summit at the start of the strategy phase, with the pools that take the two tokens. */
const summit = (choices: Record<string, number>) => componentAction(id, { phase: 'strategy', choices });
const table = (play: ReturnType<typeof summit>) => bench({ faction: 'sol', start: { hand: [id] }, entries: [play] });

describe('actionCard:summit Summit', () => {
  // "At the start of the strategy phase: Gain 2 command tokens."
  // LRR 20 (Command Sheet note): a command token gained may be placed in any of the three pools when the effect names none.
  // Checks: one token goes to the tactic pool and one to the fleet pool.
  // Why the check is redundant here: nothing is lifted; the card adds tokens outside the status phase and Leadership,
  // which the count must know to warn of the pools later.
  test.fails('actionCard:summit gains two command tokens into the pools chosen', () => {
    const play = summit({ tactic: 1, fleet: 1 });
    const end = endOf(table(play));
    quote(table(play).pack, id, 'Gain 2 command tokens.');
    expect([end.tactic, end.fleet, end.strategy]).toEqual([4, 4, 2]);
  });

  // Window "At the start of the strategy phase"; LRR 2.6: only an "ACTION" card is played as a component action.
  // Checks: played in the strategy phase it is no action outside the action phase.
  // Why the check is redundant here: the card is played in its own window, not as a turn.
  test('actionCard:summit in the strategy phase is not an action outside the action phase', () => {
    const play = summit({ tactic: 2 });
    expectNone(warningsOf(table(play), play), 'actionOutsidePhase');
  });

  // "Gain 2 command tokens."
  // Checks: three tokens asked of the card are warned of.
  // Why the check is NOT redundant here: the card gives two, no more.
  test.fails('actionCard:summit asked for more than two tokens is warned of', () => {
    const play = summit({ tactic: 3 });
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  test.fails('actionCard:summit is a play effect', () => {
    expect(effect(table(summit({})).pack, id).tier).toBe('play');
  });
});
