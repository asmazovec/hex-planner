import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './argentagent';

uiBench();

/** Two infantry produced by my dock on h1 at home: one on t1, a planet I control in the next system, one on h1. */
const production = () => {
  const move = tactical(HOME, { production: { infantry: 2 }, productionGround: { t1: { infantry: 1 }, h1: { infantry: 1 } } });
  const table = bench({
    faction: 'argent', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [move],
    game: { docks: ['h1'], planetControl: { t1: 'me' }, map: { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  });
  return { move, table };
};

// "When a player produces ground forces in a system: You may exhaust this card: that player may place those units on
//  any planets they control in that system and any adjacent systems."
// Checks: in «Used» of the production I choose the agent; it is written into the entry, and the warning about the
// infantry on t1 reads as allowed by Trilossa Aun Mirik.
// Why the check is redundant here: 68.3 puts ground forces on planets with a producing unit; the agent opens the
// planets I control in the active and the adjacent systems.
test('leader:argentagent chosen in «Used», the infantry placed in the next system reads as allowed by Trilossa Aun Mirik', async () => {
  const { move, table } = production();
  quote(table.pack, id, 'place those units on any planets they control in that system and any adjacent systems');
  const live = showUses(table, move);
  expectShownStanding('productionPlace');
  await use('Trilossa Aun Mirik');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('productionPlace', 'Trilossa Aun Mirik');
});

// LRR 68.3: "When a player produces ground forces, that player must place those units on planets that contain a unit
//  that used its Production ability."
// Checks: without the agent the same production shows the placement warning standing.
// Why the check is NOT redundant here: the agent is used by choice and was not.
test('leader:argentagent not chosen, the infantry placed in the next system stays warned of', () => {
  const { move, table } = production();
  showUses(table, move);
  expectShownStanding('productionPlace');
});
