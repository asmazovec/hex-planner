import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, HOME, planned, quote, using } from '../kit';
import { id } from './primor';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (turn: Entry, controlled = true) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [turn], game: { planetControl: controlled ? { primor: 'me' } : {} } });

// "You may exhaust this card at the end of your turn to place up to 2 infantry from your reinforcements on any planet
//  you control"
// Checks: at the end of my turn I name The Atrament in «Used»; it is taken, and nothing warns while I control Primor.
// Why no check stands: the card is mine while I control the planet (53.2, 53.3) and it is ready.
test('legendary:primor The Atrament is named in «Used» of my turn', async () => {
  const turn = pass();
  const primor = table(turn);
  quote(primor.pack, id, 'place up to 2 infantry from your reinforcements on any planet you control');
  const live = showUses(primor, turn);
  await use('The Atrament');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» asks where its infantry go: I press Home One and take two infantry; the entry keeps them.
// Why this is needed: the card places units by itself, and the plan must know the planet and how many.
test('legendary:primor the card asks for the planet and the infantry it places', async () => {
  const turn = using(pass(), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Home One' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add one Infantry' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { primorPlanet: 'h1', primorInfantry: 2 } } });
});

// LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
// Checks: named without control of Primor, the card is taken all the same and its use is warned of.
// Why the check is NOT redundant here: the card lies with whoever controls Primor.
test('legendary:primor named without control of Primor, the warning stands', async () => {
  const turn = pass();
  const live = showUses(table(turn, false), turn);
  await use('The Atrament');
  expect(live.entry().uses).toEqual([id]);
  expectShownStanding('componentNotHeld');
});
