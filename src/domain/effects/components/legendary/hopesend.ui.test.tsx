import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, HOME, planned, quote, using } from '../kit';
import { id } from './hopesend';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (turn: Entry) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [turn], game: { planetControl: { hopesend: 'me' } } });

// "You may exhaust this card at the end of your turn to place 1 mech from your reinforcements on any planet you
//  control or draw 1 action card"
// Checks: at the end of my turn I name Imperial Arms Vault in «Used»; it is taken, and nothing warns.
// Why no check stands: the card is mine while I control Hope's End (53.2, 53.3).
test('legendary:hopesend Imperial Arms Vault is named in «Used» of my turn', async () => {
  const turn = pass();
  const hopesend = table(turn);
  quote(hopesend.pack, id, 'place 1 mech from your reinforcements on any planet you control or draw 1 action card');
  const live = showUses(hopesend, turn);
  await use('Imperial Arms Vault');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» asks for the planet of the mech: I press Home One and take the mech; the entry keeps it.
// Why this is needed: the card places a unit by itself, and the plan must know where.
test('legendary:hopesend the card asks for the planet of the mech', async () => {
  const turn = using(pass(), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Home One' }));
  await userEvent.click(screen.getByRole('button', { name: 'Mech' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { hopesend: 'mech', hopesendPlanet: 'h1' } } });
});
