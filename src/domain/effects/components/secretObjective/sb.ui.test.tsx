import { test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './sb';

uiBench();

// "Have another player's promissory note in your play area."
// Checks: the status entry scores the secret with no note of another player held; the warning of an unmet requirement
// stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test.fails('secretObjective:sb scored without another player\'s note is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry] });
  quote(table.pack, id, "another player's promissory note");
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
