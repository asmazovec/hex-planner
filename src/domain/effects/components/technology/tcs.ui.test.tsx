import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Act, Entry, Opponent } from '../../../types';
import { adjust, bench, FARTHER, HOME, quote, tactical } from '../kit';
import { id } from './tcs';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'naaz', vp: 0, seat: 2, color: 2 };
const deal: Act = { kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} };
/** A turn with a transaction with a rival far down the row, who is not my neighbour. */
const table = (turn: Entry) => bench({
  faction: 'nomad', expansions: ['pok'], start: { technologies: [id] }, entries: [adjust({ tradeGoods: 2 }), turn],
  game: { opponents: [RIVAL], enemyUnits: { [FARTHER]: { o1: { carrier: 1 } } } },
});

// "... if you ready another player's agent, you may perform a transaction with that player." Ruling (Nomad, Temporal
//  Command Suite 1): the transaction needs no neighbours.
// Checks: the turn's transaction with a rival who is not my neighbour is warned of; I add Temporal Command Suite in
// «Used», and the warning reads as allowed by it.
// Why the check is redundant here: the card gives a transaction with the player whose agent it readied, wherever they are.
test('technology:tcs Temporal Command Suite is added to «Used», and the transaction with a far player reads as allowed by it', async () => {
  const turn = tactical(HOME, { acts: [deal] });
  const nomad = table(turn);
  quote(nomad.pack, id, 'you may perform a transaction with that player');
  showUses(nomad, turn);
  expectShownStanding('notNeighbor');
  await use('Temporal Command Suite');
  expectShownWaived('notNeighbor', 'Temporal Command Suite');
});

// LRR 94.1 and 60.1: transactions are with neighbours.
// Checks: without the card named the warning stands.
// Why the check is NOT redundant here: no agent was readied by the card, so it gives no transaction.
test('technology:tcs not named, the transaction with a far player stands warned of', () => {
  const turn = tactical(HOME, { acts: [deal] });
  showUses(table(turn), turn);
  expectShownStanding('notNeighbor');
});
