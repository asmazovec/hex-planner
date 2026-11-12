import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { bench, HOME, planned, quote, using } from '../kit';
import { id } from './mirage';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (turn: Entry) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [turn], game: { planetControl: { mirage: 'me' } } });

// "You may exhaust this card at the end of your turn to place up to 2 fighters from your reinforcements in any system
//  that contains 1 or more of your ships"
// Checks: at the end of my turn I name Mirage Flight Academy in «Used»; it is taken, and nothing warns.
// Why no check stands: the card is mine while I control Mirage (53.2, 53.3).
test('legendary:mirage Mirage Flight Academy is named in «Used» of my turn', async () => {
  const turn = pass();
  const mirage = table(turn);
  quote(mirage.pack, id, 'place up to 2 fighters from your reinforcements in any system that contains 1 or more of your ships');
  const live = showUses(mirage, turn);
  await use('Mirage Flight Academy');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» lets me take its fighters, two of them; the entry keeps how many.
// Why this is needed: the card places units by itself, and the plan must know how many and where.
test('legendary:mirage the card lets me take up to 2 fighters', async () => {
  const turn = using(pass(), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Add one Fighter' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add one Fighter' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { mirageFighters: 2 } } });
});
