import { test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens, NEAR, FAR, FARTHER } from '../kit';
import { id } from './deep_space';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], ...options }) };
};

// "Have units in 3 systems that do not contain planets."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:deep_space the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({ units: { [NEAR]: { destroyer: 1 } } });
  quote(t.pack, id, 'Have units in 3 systems that do not contain planets.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});

// "Have units in 3 systems that do not contain planets."
// Checks: on a board that meets the card, the status entry shows nothing of it.
// Why nothing is shown: the requirement holds when it is scored (81.1).
test('publicObjective:deep_space the board meets it, nothing is shown', () => {
  const t = table({ units: { [NEAR]: { destroyer: 1 }, [FAR]: { destroyer: 1 }, [FARTHER]: { carrier: 1 } } });
  showWarnings(t, t.status);
  expectNotShown('objectiveUnmet' as never);
});
