import { test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './unify_colonies';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: [], entries: [status], ...options }) };
};

// "Control 6 planets that each have the same planet trait."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:unify_colonies the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({});
  quote(t.pack, id, 'Control 6 planets that each have the same planet trait.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});
