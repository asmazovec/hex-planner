import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Opponent } from '../../../types';
import { adjust, bench, FAR, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './guild_ships';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
/** The warnings of a turn with a transaction with a player two systems away. */
const turn = (faction: string) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} }] });
  const table = bench({ faction, units: { [HOME]: { carrier: 1 } }, entries: [adjust({ tradeGoods: 1 }), move], game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });
  showWarnings(table, move);
  return table;
};

// "You can negotiate transactions with players who are not your neighbor."
// Checks: the transaction with a stranger is listed as allowed by Guild Ships.
// Why the check is redundant here: 94.1 allows transactions with neighbours only; the Hacan trade with anyone.
test('ability:guild_ships a transaction with a stranger reads as allowed by Guild Ships', () => {
  quote(turn('hacan').pack, id, 'You can negotiate transactions with players who are not your neighbor.');
  expectShownWaived('notNeighbor', 'Guild Ships');
});

// LRR 94.1: only with neighbours.
// Checks: the same turn of another faction shows the warning standing.
// Why the check is NOT redundant here: the ability is printed on the Hacan sheet only.
test('ability:guild_ships another faction\'s transaction with a stranger stands', () => {
  turn('sol');
  expectShownStanding('notNeighbor');
});
