import { test } from 'vitest';
import type { Entry } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens, HOME, FAR } from '../kit';
import { id } from './engineer_marvel';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], ...options }) };
};

// "Have your flagship or a war sun on the game board."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:engineer_marvel the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({ units: { [HOME]: { dreadnought: 3 } } });
  quote(t.pack, id, 'Have your flagship or a war sun on the game board.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});

// "Have your flagship or a war sun on the game board."
// Checks: on a board that meets the card, the status entry shows nothing of it.
// Why nothing is shown: the requirement holds when it is scored (81.1).
test('publicObjective:engineer_marvel the board meets it, nothing is shown', () => {
  const t = table({ units: { [FAR]: { warsun: 1 } } });
  showWarnings(t, t.status);
  expectNotShown('objectiveUnmet' as never);
});
