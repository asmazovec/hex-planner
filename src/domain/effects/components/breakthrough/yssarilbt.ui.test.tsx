import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Act } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './yssarilbt';

uiBench();

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const deal: Act = { kind: 'transaction', with: 'me', give: {}, get: {} };
const show = (uses: string[]) => {
  const entry = { ...tactical(NEAR, { acts: [deal, deal] }), owner: 'o1', uses } as Entry;
  const table = bench({
    faction: 'yssaril', expansions: ['te'], units: { [NEAR]: { carrier: 1 } }, start: { breakthrough: 'held' }, entries: [entry],
    game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } } },
  });
  showWarnings(table, entry);
  return table;
};

// "During the action phase, that transaction does not count against the once-per-player transaction limit for that turn."
// Checks: the Sol player's turn that uses Stall Tactics by the breakthrough shows the warning of the second transaction
// with me in the allowed look, naming Deepgloom Executable.
// Why the check is redundant here: the transaction the card brings is outside the limit of one per player (94.1).
test('breakthrough:yssarilbt the second transaction shows its warning as allowed by Deepgloom Executable', () => {
  const table = show(['ability:stall_tactics', id]);
  quote(table.pack, id, 'that transaction does not count against the once-per-player transaction limit');
  expectShownWaived('transactionRepeated', 'Deepgloom Executable');
});

// LRR 94.1: one transaction with each neighbour per turn.
// Checks: without the Yssaril ability used, the warning stands.
// Why the check is NOT redundant here: the card covers only the transaction that comes with the use of Stall Tactics or Scheming.
test('breakthrough:yssarilbt without Stall Tactics the warning stands', () => {
  show([id]);
  expectShownStanding('transactionRepeated');
});
