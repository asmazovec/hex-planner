import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './ce';

uiBench();

const NOTE = `${id}@o1`;

/** I play the Sol, hold the L1Z1X note, and give out three tokens at the status phase. */
const status = () => {
  const entry = statusTokens(2, 1, 0);
  const table = bench({ faction: 'sol', game: { opponents: [{ id: 'o1', faction: 'l1z1x', vp: 0, seat: 2, color: 2 }] }, start: { promissory: [NOTE] }, entries: [entry] });
  return { entry, table };
};

// "When you gain command tokens during the status phase: Gain 1 additional command token."
// Checks: in «Used» of the status entry I choose Cybernetic Enhancements; it is written into the entry and the
// warning of too many tokens is gone.
// Why the check is redundant here: with the note three tokens are gained, as many as the entry gives out.
test.fails('promissory:ce chosen in «Used» of the status phase, three tokens are given without a warning', async () => {
  const { entry, table } = status();
  quote(table.pack, id, 'Gain 1 additional command token');
  const live = showUses(table, entry);
  await use('Cybernetic Enhancements');
  expect(live.entry().uses).toEqual([NOTE]);
  expectNotShown('tokensOver');
});

// LRR 81.5: "Each player gains two command tokens."
// Checks: without choosing the note the warning of too many tokens stands.
// Why the check is NOT redundant here: a note acts when it is played.
test('promissory:ce not chosen, three tokens are too many', () => {
  const { entry, table } = status();
  showUses(table, entry);
  expectShownStanding('tokensOver');
});
