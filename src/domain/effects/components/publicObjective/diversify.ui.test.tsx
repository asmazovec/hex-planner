import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, planned, quote } from '../kit';
import { id } from './diversify';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;

// "Own 2 technologies in each of 2 colors."
// Checks: the status entry scores Diversify Research with two technologies in one colour only: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:diversify scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
    start: { technologies: ['technology:gd', 'technology:amd', 'technology:nm', 'technology:st'] },
  });
  quote(table.pack, id, 'Own 2 technologies in each of 2 colors.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
