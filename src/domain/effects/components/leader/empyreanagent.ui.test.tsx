import { expect, test } from 'vitest';
import { project } from '../../../project';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Game } from '../../../types';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './empyreanagent';

uiBench();

const tokens = (game: Game, pack: Parameters<typeof project>[3]): number => {
  const { state } = project(game, game.plans[0], 'forecast', pack);
  return state.tactic + state.fleet + state.strategy;
};

// "After a player moves ships into a system that does not contain any planets: You may exhaust this card: that player
//  gains 1 command token."
// Checks: my cruiser moves into the empty system next to home; I name Acamar in «Used», it is written into the entry,
// and the plan counts one command token more than before.
// Why the default count is not enough here: the tactical action only spends its token; the agent gives one.
test('leader:empyreanagent named in Used after a move into an empty system, the plan counts one command token more', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
  const table = bench({ faction: 'empyrean', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });
  quote(table.pack, id, 'that player gains 1 command token');
  const live = showUses(table, move);
  const before = tokens(live.game(), table.pack);
  await use('Acamar');
  expect(live.entry().uses).toEqual([id]);
  expect(tokens(live.game(), table.pack)).toBe(before + 1);
});
