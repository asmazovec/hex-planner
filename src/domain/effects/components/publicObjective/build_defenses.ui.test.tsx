import { test } from 'vitest';
import type { Entry } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './build_defenses';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], ...options }) };
};

// "Have 4 or more structures."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:build_defenses the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({ game: { planetControl: { h1: 'me' }, docks: ['h1'] } });
  quote(t.pack, id, 'Have 4 or more structures.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});

// "Have 4 or more structures."
// Checks: on a board that meets the card, the status entry shows nothing of it.
// Why nothing is shown: the requirement holds when it is scored (81.1).
test('publicObjective:build_defenses the board meets it, nothing is shown', () => {
  const t = table({ game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' }, docks: ['h1'], pds: { h1: 2, t1: 1 } } });
  showWarnings(t, t.status);
  expectNotShown('objectiveUnmet' as never);
});
