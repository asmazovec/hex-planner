import { expect, test } from 'vitest';
import { project } from '../../../project';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, FAR, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './ghost_mech';

uiBench();

// "After any player activates a system, you may remove this unit from the game board to place or move a Creuss
//  wormhole token into this system."
// Checks: in «Used» of an activation I choose Icarus Drive; it is written into the entry, and the mech in FAR is off
// the board at the end of the plan.
// Why the check is redundant here: the mech removes itself by its own ability.
test('mech:ghost_mech named in «Used» of an activation leaves the board', async () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const table = bench({ faction: 'ghost', expansions: ['pok'], units: { [HOME]: { cruiser: 1 }, [FAR]: { mech: 1 } }, entries: [move] });
  quote(table.pack, id, 'remove this unit from the game board');
  const live = showUses(table, move);
  await use('Icarus Drive');
  expect(live.entry().uses).toEqual([id]);
  const game = live.game();
  expect(project(game, game.plans[0], 'forecast', table.pack).state.systems[FAR]?.mech ?? 0).toBe(0);
});
