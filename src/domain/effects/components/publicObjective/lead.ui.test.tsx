import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { adjust, bench, planned, quote } from '../kit';
import { id } from './lead';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;

// "Spend a total of 3 tokens from your tactic and/or strategy pools."
// Checks: the status entry scores Lead From the Front with the tactic tokens moved to the fleet pool, 2 strategy tokens left: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:lead scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [adjust({ tactic: -3, fleet: 3 }), scoring],
  });
  quote(table.pack, id, 'Spend a total of 3 tokens from your tactic and/or strategy pools.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
