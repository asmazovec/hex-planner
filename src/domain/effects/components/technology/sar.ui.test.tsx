import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, endOf, HOME, quote, tactical } from '../kit';
import { id } from './sar';

uiBench();

const production = () => {
  const entry = tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  return { entry, ...bench({ faction: 'hacan', expansions: ['pok'], start: { technologies: [id] }, entries: [entry], game: { docks: ['h1'] } }) };
};

// "After 1 or more of your units use PRODUCTION, you may exhaust this card to place 1 mech from your reinforcements on
//  a planet you control in that system."
// Checks: in «Used» of a tactical action that produces I choose Self-Assembly Routines; it is named in the entry and
// the plan then has one mech on a planet of the home system.
// Why the default does not apply: a mech is otherwise only produced and paid for; the card places one.
test.fails('technology:sar chosen in «Used» of a production, a mech stands on a planet of that system', async () => {
  const table = production();
  quote(table.pack, id, 'place 1 mech from your reinforcements on a planet you control in that system');
  const live = showUses(table, table.entry);
  await use('Self-Assembly Routines');
  expect(live.entry().uses).toEqual([id]);
  const end = endOf({ pack: table.pack, game: live.game() });
  expect((end.ground.h1?.mech ?? 0) + (end.ground.h2?.mech ?? 0)).toBe(1);
});

// Checks: chosen in «Used», the card is named in the entry as soon as it is chosen (what the play builds on).
// Why nothing is validated here: whether the mech is placed is the play's business; the choice itself forbids nothing.
test('technology:sar can be chosen in «Used» of a production', async () => {
  const table = production();
  const live = showUses(table, table.entry);
  await use('Self-Assembly Routines');
  expect(live.entry().uses).toEqual([id]);
});
