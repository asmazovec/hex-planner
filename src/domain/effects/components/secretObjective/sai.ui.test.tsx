import { test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './sai';

uiBench();

// "Control a legendary planet."
// Checks: the status entry scores the secret with only the home planets controlled; the warning of an unmet requirement
// stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test('secretObjective:sai scored without a legendary planet is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry] });
  quote(table.pack, id, 'Control a legendary planet.');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
