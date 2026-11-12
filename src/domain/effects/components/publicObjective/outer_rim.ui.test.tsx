import { test } from 'vitest';
import type { Entry } from '../../../types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens, HOME } from '../kit';
import { id } from './outer_rim';

uiBench();

/** The status entry of round 1 that scores the objective, on a board set by `options`. */
const table = (options: Omit<Parameters<typeof bench>[0], 'faction' | 'entries' | 'expansions'>) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], ...options }) };
};

// "Have units in 3 systems on the edge of the game board other than your home system."
// LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
// Checks: on a board that does not meet the card, the status entry shows the unmet objective, standing: the player may still plan the score.
// Why the check is NOT redundant here: the objective's requirement is not met on this board.
test('publicObjective:outer_rim the board does not meet it, the status entry shows objectiveUnmet standing', () => {
  const t = table({ units: { [HOME]: { carrier: 1 } } });
  quote(t.pack, id, 'Have units in 3 systems on the edge of the game board other than your home system.');
  showWarnings(t, t.status);
  expectShownStanding('objectiveUnmet' as never);
});
