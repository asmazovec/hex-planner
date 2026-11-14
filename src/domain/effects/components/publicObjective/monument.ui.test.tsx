import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, planned, quote } from '../kit';
import { id } from './monument';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;

// "Spend 8 resources."
// Checks: the status entry scores Erect a Monument with 4 resources of planets and no trade goods: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:monument scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
  });
  quote(table.pack, id, 'Spend 8 resources.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
