import { test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './pem';

uiBench();

// "Have units with a combined PRODUCTION value of at least 8 in a single system."
// Checks: the status entry scores the secret with one space dock of 5 on Home One; the warning of an unmet requirement
// stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test('secretObjective:pem scored with Production short of 8 is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry], game: { docks: ['h1'] } });
  quote(table.pack, id, 'combined PRODUCTION value of at least 8 in a single system');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
