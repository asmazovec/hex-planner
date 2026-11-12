import { test } from 'vitest';
import type { Entry } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './galvanize';

uiBench();

/** `spend` is the field pass 2 adds to the status entry: the tokens the objective takes from the pools. */
const table = (tactic: number, strategy: number) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id], spend: { tactic, strategy } } as unknown as Entry;
  return { status, ...bench({ faction: 'sol', entries: [adjust({ tactic: 2 }), status] }) };
};

// "Spend a total of 6 tokens from your tactic and/or strategy pools."
// Checks: four tactic and two strategy tokens: the status entry shows no pool below zero.
// Why nothing is shown: the pools hold the tokens spent.
test('publicObjective:galvanize six tokens the pools hold, nothing is shown', () => {
  const t = table(4, 2);
  quote(t.pack, id, 'Spend a total of 6 tokens from your tactic and/or strategy pools.');
  showWarnings(t, t.status);
  expectNotShown('poolNegative');
});

// LRR 20.4 with the card's "from your tactic and/or strategy pools".
// Checks: six tokens from a tactic pool of five are shown as a pool below zero, standing.
// Why the check is NOT redundant here: a pool cannot give tokens it does not hold.
test('publicObjective:galvanize more tokens than the pool holds are shown, standing', () => {
  const t = table(6, 0);
  showWarnings(t, t.status);
  expectShownStanding('poolNegative');
});

test.todo('publicObjective:galvanize the player scores the objective and picks the pools in the status entry: the status entry has no editor for `scored` and `spend` yet');
