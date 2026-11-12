import { test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './syc';

uiBench();

// "Control a planet in a system that contains a planet controlled by another player."
// Checks: the status entry scores the secret with Target One mine and nobody else's planet beside it; the warning of an
// unmet requirement stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test.fails('secretObjective:syc scored with no shared system is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry], game: { planetControl: { t1: 'me' } } });
  quote(table.pack, id, 'contains a planet controlled by another player');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
