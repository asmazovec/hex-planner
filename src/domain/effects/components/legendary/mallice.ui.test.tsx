import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, planned, quote, using } from '../kit';
import { id } from './mallice';

uiBench();

/** A pass that already names the card: Exterrix Headquarters is the name of both sides of Mallice, so it is not searched for. */
const table = (turn: Entry) => bench({ faction: 'sol', expansions: ['pok'], entries: [turn], game: { planetControl: { mallice: 'me' } } });

// "You may exhaust this card at the end of your turn to gain 2 trade goods or convert all of your commodities to trade
//  goods."
// Checks: named in «Used» of my pass while I control Mallice, the card stands there and nothing warns.
// Why no check stands: the card is mine while I control the planet (53.2, 53.3).
test('legendary:mallice Exterrix Headquarters stands in «Used» with no warning', () => {
  const turn = using(planned({ type: 'pass' } as EntryBody), id);
  const mallice = table(turn);
  quote(mallice.pack, id, 'gain 2 trade goods or convert all of your commodities to trade goods');
  showUses(mallice, turn);
  expect(screen.getAllByText('Exterrix Headquarters')[0]).toBeVisible();
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» offers its two branches; I press «Gain 2 trade goods» and the entry keeps the choice.
// Why this is needed: the card changes the trade goods or the commodities, and the plan must know which.
test('legendary:mallice the card asks which branch is taken', async () => {
  const turn = using(planned({ type: 'pass' } as EntryBody), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Gain 2 trade goods' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { exterrix: 'tradeGoods' } } });
});
