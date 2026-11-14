import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectShownStanding, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import { tech } from '../../../rules/kit';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, HOME, planned, quote, using } from '../kit';
import { id } from './industrex';

uiBench();

const CONDITION = 'componentCondition' as ExtensionCode;
const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (entry: Entry, technologies = [tech('cruiser')]) =>
  bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [entry], game: { planetControl: { industrex: 'me' } } });

// "You may exhaust this card when you pass to place 1 ship that matches a unit upgrade technology you own from your
//  reinforcements into a system that contains your ships."
// Checks: on the pass I take Aeurex Mechanica in «Used»; it offers the ship to place (a group named «Placed with
// Aeurex Mechanica» with the take buttons of UnitDraft), I take a cruiser, and the choice is written into the entry.
// Why no check is lifted: the card is a placement of its own, done by its play.
test('legendary:industrex on the pass the ship to place is taken after choosing Aeurex Mechanica', async () => {
  const entry = pass();
  const game = table(entry);
  quote(game.pack, id, 'place 1 ship that matches a unit upgrade technology you own');
  const live = showUses(game, entry);
  await use('Aeurex Mechanica');
  await userEvent.click(within(screen.getByRole('group', { name: 'Placed with Aeurex Mechanica' })).getByRole('button', { name: 'Cruiser' }));
  expect(live.entry()).toMatchObject({ uses: [id], useChoices: { [id]: { unit: 'cruiser' } } });
});

// "... a unit upgrade technology you own ..."
// Checks: without Cruiser II the cruiser placed shows the condition warning, standing.
// Why the check is NOT redundant here: the card places only a ship whose upgrade is owned.
test('legendary:industrex a cruiser without Cruiser II shows the condition warning', () => {
  const entry = { ...using(pass(), id), choices: { unit: 'cruiser', system: HOME } } as Entry;
  showWarnings(table(entry, []), entry);
  expectShownStanding(CONDITION);
});
