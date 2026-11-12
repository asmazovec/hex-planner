import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, Opponent } from '../../../types';
import { adjust, bench, componentAction, FAR, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './convoys';

uiBench();

const HACAN: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
/** The warnings of a turn with a transaction with the Hacan, who sits two systems away; `before` comes first in the round. */
const turn = (before: Entry[]) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { carrier: 1 } }, start: { promissory: [NOTE] }, entries: [adjust({ tradeGoods: 1 }), ...before, move],
    game: { opponents: [HACAN], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } },
  });
  showWarnings(table, move);
  return table;
};

// "While this card is in your play area, you may negotiate transactions with players who are not your neighbor."
// Checks: after the note is played, the transaction with the Hacan is listed as allowed by Trade Convoys.
// Why the check is redundant here: the card in play lifts the neighbour rule of 94.1.
test('promissory:convoys played, the transaction with a stranger reads as allowed by Trade Convoys', () => {
  quote(turn([componentAction(NOTE)]).pack, id, 'you may negotiate transactions with players who are not your neighbor');
  expectShownWaived('notNeighbor', 'Trade Convoys');
});

// Ruling (Hacan, Trade Convoys 4): "Trade Convoys has no effect while it is in a player's hand."
// Checks: held, not played, the warning stands.
// Why the check is NOT redundant here: the card acts only from the play area.
test('promissory:convoys held in hand, the transaction with a stranger stands', () => {
  turn([]);
  expectShownStanding('notNeighbor');
});
