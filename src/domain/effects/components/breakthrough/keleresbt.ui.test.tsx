import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, Opponent, StartHoldings } from '../../../types';
import { bench, FAR, FARTHER, HOME, planned, quote, TARGET } from '../kit';
import { id } from './keleresbt';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const table = (start: StartHoldings, deal: Entry) => bench({
  faction: 'keleresm', expansions: ['pok', 'te'], units: { [HOME]: { carrier: 1 } }, start, entries: [deal],
  game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } }, map: { [HOME]: 'r-home', '1,0': 'r-empty', [TARGET]: '18', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
});
const deal = (): Entry => planned({ type: 'pass', acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 0 }, get: {} }] }, 'action');

// "You are neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system."
// Checks: a transaction with a player whose cruiser stands beside Mecatol Rex, three systems from me; the warning
// that we are not neighbours is shown in the allowed look, naming the breakthrough.
// Why the check is redundant here: the breakthrough makes that player my neighbour (94.1 then holds).
test.fails('breakthrough:keleresbt the transaction with a player beside Mecatol Rex reads as allowed by I.I.H.Q. Modernization', () => {
  const turn = deal();
  const keleres = table({ breakthrough: 'held' }, turn);
  quote(keleres.pack, id, 'You are neighbors with all players');
  showWarnings(keleres, turn);
  expectShownWaived('notNeighbor', 'I.I.H.Q. Modernization');
});

// LRR 94.1: only neighbours resolve transactions.
// Checks: without the breakthrough the warning stands.
// Why the check is NOT redundant here: the breakthrough is not held.
test('breakthrough:keleresbt not held, the transaction with that player shows the warning standing', () => {
  const turn = deal();
  showWarnings(table({}, turn), turn);
  expectShownStanding('notNeighbor');
});
