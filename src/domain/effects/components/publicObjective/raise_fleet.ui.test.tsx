import { test } from 'vitest';
import type { Entry } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens, HOME } from '../kit';
import { id } from './raise_fleet';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], ...options }) };
};

// "Have 5 or more non-fighter ships in 1 system."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:raise_fleet the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({ units: { [HOME]: { cruiser: 4, fighter: 3 } } });
  quote(t.pack, id, 'Have 5 or more non-fighter ships in 1 system.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});

// "Have 5 or more non-fighter ships in 1 system."
// Checks: on a board that meets the card, the status entry shows nothing of it.
// Why nothing is shown: the requirement holds when it is scored (81.1).
test('publicObjective:raise_fleet the board meets it, nothing is shown', () => {
  const t = table({ units: { [HOME]: { cruiser: 3, destroyer: 2 } } });
  showWarnings(t, t.status);
  expectNotShown('objectiveUnmet' as never);
});
