import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET } from '../kit';
import { id } from './intimidate';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;

// "Have 1 or more ships in 2 systems that are adjacent to Mecatol Rex's system."
// Checks: the status entry scores Intimidate Council with ships in one system adjacent to Mecatol Rex and in Mecatol Rex itself: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:intimidate scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
    units: { [NEAR]: { cruiser: 1 }, [TARGET]: { cruiser: 1 } },
    game: { map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: '18', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  });
  quote(table.pack, id, "Have 1 or more ships in 2 systems that are adjacent to Mecatol Rex's system.");
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
