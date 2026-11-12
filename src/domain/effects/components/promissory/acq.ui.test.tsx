import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './acq';

uiBench();

const NOTE = `${id}@winnu`;
const table = () => {
  const politics = secondary(CARD.politics);
  return { politics, table: bench({ faction: 'sol', start: { promissory: [NOTE] }, entries: [adjust({ strategy: -2 }), politics] }) };
};

// "You do not have to spend or place a command token to resolve the secondary ability of that strategy card."
// Checks: with the strategy pool empty, I choose Acquiescence in «Used» of Politics' secondary; the warning that no
// strategy token is left reads as allowed by the note.
// Why the check is redundant here: the note frees the secondary of its token (20.5, 83.4).
test('promissory:acq chosen in «Used» of a secondary, the empty strategy pool reads as allowed by Acquiescence', async () => {
  const { politics, table: sol } = table();
  quote(sol.pack, id, 'You do not have to spend or place a command token');
  showUses(sol, politics);
  await use('Acquiescence');
  expectShownWaived('shortStrategy', 'Acquiescence');
});

// LRR 20.5: the secondary is paid with a strategy token.
// Checks: without the note the warning of the empty pool stands.
// Why the check is NOT redundant here: the note is held, not played.
test('promissory:acq not chosen, the empty strategy pool stands', () => {
  const { politics, table: sol } = table();
  showUses(sol, politics);
  expectShownStanding('shortStrategy');
});
