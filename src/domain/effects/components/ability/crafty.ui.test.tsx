import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './crafty';

uiBench();

/** The check of the hand limit pass 2 adds (LRR 2.4). */
const HAND_LIMIT = 'handOverLimit' as ExtensionCode;
const SEVEN = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];
const show = (faction: string) => {
  const entry = tactical(NEAR, {}, { gains: ['actionCard:disable'] });
  const table = bench({ faction, start: { hand: SEVEN }, entries: [entry] });
  showWarnings(table, entry);
  return table;
};

// "You can have any number of action cards in your hand."
// Checks: the turn that draws the eighth card shows the warning of the hand limit in the allowed look, naming Crafty.
// Why the check is redundant here: Crafty lifts the limit of seven cards for the Yssaril.
test.fails('ability:crafty the eighth action card shows its warning as allowed by Crafty', () => {
  const table = show('yssaril');
  quote(table.pack, id, 'You can have any number of action cards in your hand.');
  expectShownWaived(HAND_LIMIT, 'Crafty');
});

// LRR 2.4: "Each player's hand can have a maximum of seven action cards."
// Checks: another faction's eighth card shows the warning standing.
// Why the check is NOT redundant here: the ability is printed on the Yssaril sheet alone.
test.fails('ability:crafty another faction\'s eighth card shows the warning standing', () => {
  show('sol');
  expectShownStanding(HAND_LIMIT);
});
