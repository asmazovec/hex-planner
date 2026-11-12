import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, quote, secondary } from '../kit';
import { id } from './jolnaragent';

uiBench();

/** Gravity Drive by the secondary (4 resources), paid with Home Two (1); the three infantry of Home One are chosen for removal. */
const research = (): Entry => ({
  ...secondary(CARD.technology, { researched: ['technology:gd'], payment: { planets: ['h2'], tradeGoods: 0 } }), choices: { h1: 3 },
} as Entry);
const jolnar = (entry: Entry) => bench({
  faction: 'jolnar', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [adjust({ ground: { h1: { infantry: 3 } } }), entry],
});

// "You may exhaust this card to allow that player to remove any number of their infantry from the game board. For each
//  unit removed, reduce the resources spent by 1."
// Checks: the research is short of resources until I choose Doctor Sucaban in «Used»; then the shortfall is gone
// and the three infantry of Home One leave the board.
// Why the default cost does not apply: the cost is lowered by one per infantry removed (a change of the number, so
// the warning disappears instead of being shown as allowed).
test.fails('leader:jolnaragent chosen in «Used» removes infantry and the shortfall of resources goes', async () => {
  const entry = research();
  const table = jolnar(entry);
  quote(table.pack, id, 'For each unit removed, reduce the resources spent by 1.');
  const live = showUses(table, entry);
  expectShownStanding('shortResources');
  await use(componentById(table.pack, id)!.name);
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('shortResources');
  expect(endOf({ pack: table.pack, game: live.game() }).ground.h1?.infantry ?? 0).toBe(0);
});
