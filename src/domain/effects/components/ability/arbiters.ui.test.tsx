import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Player } from '../../../players';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './arbiters';

uiBench();

const RIVAL: Player = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const CARD_IN_HAND = 'actionCard:sabo1';
/** The warnings of a turn in which I give a neighbour an action card. */
const turn = (faction: string) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [{ kind: 'transaction', with: 'o1', give: { components: [CARD_IN_HAND] }, get: {} }] });
  const table = bench({ faction, units: { [HOME]: { carrier: 1 } }, start: { hand: [CARD_IN_HAND] }, entries: [move], game: { opponents: [RIVAL], enemyUnits: { [TARGET]: { o1: { carrier: 1 } } } } });
  showWarnings(table, move);
  return table;
};

// "When you are negotiating a transaction, action cards can be exchanged as part of that transaction."
// Checks: the action card given in a transaction is listed as allowed by Arbiters.
// Why the check is redundant here: 94.3 keeps action cards out of transactions, 94.3.1 lets the Hacan trade them.
test('ability:arbiters an action card in a transaction reads as allowed by Arbiters', () => {
  quote(turn('hacan').pack, id, 'action cards can be exchanged as part of that transaction');
  expectShownWaived('transactionKind', 'Arbiters');
});

// LRR 94.3: players "cannot exchange other types of cards or tokens".
// Checks: another faction's action card in a transaction is shown as a standing warning.
// Why the check is NOT redundant here: only the Hacan may trade action cards; today nobody is warned (pass 2).
test('ability:arbiters another faction\'s action card in a transaction stands', () => {
  turn('sol');
  expectShownStanding('transactionKind');
});
