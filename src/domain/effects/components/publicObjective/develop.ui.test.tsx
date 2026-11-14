import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, planned, quote } from '../kit';
import { id } from './develop';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;

// "Own 2 unit upgrade technologies."
// Checks: the status entry scores Develop Weaponry with one unit upgrade owned: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:develop scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
    start: { technologies: ['technology:dd2', 'technology:gd'] },
  });
  quote(table.pack, id, 'Own 2 unit upgrade technologies.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
