import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './sardakkagent';

uiBench();

/** My action takes t1 with one infantry; the planet for the agent is chosen in the entry. */
const invade = (): Entry => tactical(TARGET, {
  moves: [{ from: HOME, units: { cruiser: 1, infantry: 1 }, via: [NEAR] }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, { choices: { planet: 't1' } });
const sardakk = (move: Entry) =>
  bench({ faction: 'sardakk', expansions: ['pok'], units: { [HOME]: { cruiser: 1, infantry: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });

// "At the end of a player's tactical action: You may exhaust this card: if you do, that player may place 2 infantry
//  from their reinforcements on a planet they control in the active system."
// Checks: in «Used» of my tactical action I choose T'ro; the entry names it, and the plan then has three infantry on
// Target One.
// Why nothing is waived here: the agent adds units, which the plan counts; it lifts no check.
test('leader:sardakkagent chosen in «Used» places 2 infantry on the planet taken', async () => {
  const move = invade();
  const table = sardakk(move);
  quote(table.pack, id, 'that player may place 2 infantry from their reinforcements');
  const live = showUses(table, move);
  await use(componentById(table.pack, id)!.name);
  expect(live.entry().uses).toEqual([id]);
  expect(endOf({ pack: table.pack, game: live.game() }).ground.t1).toEqual({ infantry: 3 });
});

// Checks: the agent can be chosen in «Used» at all, and is written into the entry.
// Why nothing is validated here: choosing forbids nothing; what the agent does is the test above.
test('leader:sardakkagent can be chosen in «Used» of a tactical action', async () => {
  const move = invade();
  const table = sardakk(move);
  const live = showUses(table, move);
  await use(componentById(table.pack, id)!.name);
  expect(live.entry().uses).toEqual([id]);
});
