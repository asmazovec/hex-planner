import { expect, test } from 'vitest';
import { project } from '../../../project';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './ghostcommander';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-alpha' };

// "After your ships move: For each ship that has a capacity value and moved through 1 or more wormholes, you may place
//  1 fighter from your reinforcements with that ship if you have unused capacity in the active system."
// Checks: in «Used» of a tactical action through the alpha wormholes I choose Sai Seravus; it is written into the
// entry, and a fighter stands with the carrier at the end of the plan.
// Why the check is redundant here: the commander places the fighter itself, no production is asked.
test('leader:ghostcommander named in «Used» of a move through a wormhole places a fighter with the carrier', async () => {
  const move = tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1 } }] });
  const table = bench({ faction: 'ghost', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move], game: { map: MAP } });
  quote(table.pack, id, 'place 1 fighter from your reinforcements with that ship');
  const live = showUses(table, move);
  await use('Sai Seravus');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
  const game = live.game();
  expect(project(game, game.plans[0], 'forecast', table.pack).state.systems[FARTHER]).toEqual({ carrier: 1, fighter: 1 });
});
