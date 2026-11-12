import { expect, test } from 'vitest';
import { choose, showComponent, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, endOf, quote, TARGET, tactical } from '../kit';
import { id } from './arborecbt';

uiBench();

/** I activate the target, where my one infantry stands on t1, and Psychospore is the next entry. */
const table = () => {
  const play = componentAction(id);
  return { play, ...bench({
    faction: 'arborec', expansions: ['pok', 'te'], start: { breakthrough: 'held' },
    entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), tactical(TARGET), play],
    game: { planetControl: { t1: 'me' } },
  }) };
};

// "ACTION: Exhaust this card to remove a command token from a system that contains 1 or more of your infantry and
//  return it to your reinforcements. Then, place 1 infantry in that system."
// Checks: the component action of Psychospore asks for the system; pressing the target keeps it in the entry's
// choices, and the plan then holds one infantry more there.
// Why the check is NOT redundant here: the interface has to let the player name the system the token leaves.
test('breakthrough:arborecbt the system is chosen in the editor of the action', async () => {
  const bt = table();
  quote(bt.pack, id, 'Then, place 1 infantry in that system');
  const live = showComponent(bt, bt.play);
  await choose(/Target/);
  expect(live.entry().choices).toEqual({ systemId: TARGET });
  expect(endOf({ pack: bt.pack, game: live.game() }).ground.t1?.infantry).toBe(2);
});
