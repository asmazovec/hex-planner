import { expect, test } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, quote, secondary } from '../kit';
import { id } from './jolnaragent';

uiBench();

/** Two technologies by the secondary (Brilliant: the second costs 6 resources), paid with Home Two (1); the five infantry of Home One are chosen for removal. */
const research = (): Entry => ({
  ...secondary(CARD.technology, { researched: ['technology:nm', 'technology:gd'], payment: { planets: ['h2'], tradeGoods: 0 } }), choices: { h1: 5 },
} as Entry);
const jolnar = (entry: Entry) => bench({
  faction: 'jolnar', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [adjust({ ground: { h1: { infantry: 5 } } }), entry],
});

// "You may exhaust this card to allow that player to remove any number of their infantry from the game board. For each
//  unit removed, reduce the resources spent by 1."
// Checks: the research is short of resources until I choose Doctor Sucaban in «Used»; then the shortfall is gone
// and the five infantry of Home One leave the board.
// Why the default cost does not apply: the cost is lowered by one per infantry removed (a change of the number, so
// the warning disappears instead of being shown as allowed).
test('leader:jolnaragent chosen in «Used» removes infantry and the shortfall of resources goes', async () => {
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

// "You may allow that player to remove any number of their infantry from the game board."
// Checks: the editor itself offers the infantry of each planet to remove, and the number pressed lowers the cost.
// Why not seeded: the pressed number is what the replay then reads from the entry's choices.
test('leader:jolnaragent the number of infantry removed is pressed in the editor, one for each resource', async () => {
  const entry = { ...research(), choices: undefined } as Entry;
  const table = jolnar(entry);
  const live = showUses(table, entry);
  await use(componentById(table.pack, id)!.name);
  expectShownStanding('shortResources');
  const remove = screen.getByRole('button', { name: 'Remove one Infantry on Home One' });
  for (let i = 0; i < 5; i += 1) await userEvent.click(remove);
  expect(live.entry().useChoices?.[id]).toEqual({ h1: 5 });
  expectNotShown('shortResources');
  expect(endOf({ pack: table.pack, game: live.game() }).ground.h1?.infantry ?? 0).toBe(0);
});
