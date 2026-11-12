import { test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './otf';

uiBench();

// "Have 9 or more ground forces on a planet that does not contain 1 of your space docks."
// Checks: the status entry scores the secret with no ground forces anywhere; the warning of an unmet requirement stands
// on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test.fails('secretObjective:otf scored without nine ground forces on a planet is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry] });
  quote(table.pack, id, 'Have 9 or more ground forces on a planet');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
