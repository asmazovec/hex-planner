import { test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './hrm';

uiBench();

// "Control planets that have a combined resource value of at least 12."
// Checks: the status entry scores the secret with the home planets alone (4 resources); the warning of an unmet
// requirement stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil, and
// four resources are short of twelve.
test('secretObjective:hrm scored short of twelve resources is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry] });
  quote(table.pack, id, 'combined resource value of at least 12');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
