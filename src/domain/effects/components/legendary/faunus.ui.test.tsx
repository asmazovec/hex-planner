import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { bench, planned, quote, using } from '../kit';
import { id } from './faunus';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (turn: Entry) => bench({ faction: 'sol', expansions: ['te'], entries: [turn], game: { planetControl: { faunus: 'me' } } });

// "You may exhaust this card when you pass to gain control of a non-home, non-legendary planet that contains no units
//  and has no attachments."
// Checks: when I pass I name Maxis Central Control in «Used»; it is taken, and nothing warns.
// Why no check stands: the card is mine while I control Faunus (53.2, 53.3), and this is my pass.
test('legendary:faunus Maxis Central Control is named in «Used» of my pass', async () => {
  const turn = pass();
  const faunus = table(turn);
  quote(faunus.pack, id, 'gain control of a non-home, non-legendary planet');
  const live = showUses(faunus, turn);
  await use('Maxis Central Control');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» asks for the planet; I press Target One and the entry keeps it.
// Why this is needed: the card gives control of a planet by itself, and the plan must know which.
test('legendary:faunus the card asks for the planet it takes', async () => {
  const turn = using(pass(), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Target One' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { faunusPlanet: 't1' } } });
});
