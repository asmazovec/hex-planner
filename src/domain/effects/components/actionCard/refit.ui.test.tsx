import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { showTurn, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, quote } from '../kit';
import { id } from './refit';

uiBench();

// "Choose 1 or 2 of your infantry on the game board. Replace each of those infantry with mechs."
// Checks: the editor of the component action that plays the card offers my infantry by planet, and a press chooses one
// to replace; it is kept in the entry's choices under the planet (a `counts` choice), and the minus takes it back.
// Why the check is redundant here: nothing is lifted; the player must be able to say which infantry the card replaces.
test('actionCard:refit the component action offers the infantry of Home One to replace with a mech', async () => {
  const entry = componentAction(id);
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [adjust({ ground: { h1: { infantry: 2 } } }), entry], game: { planetControl: { h1: 'me' } } });
  quote(table.pack, id, 'Choose 1 or 2 of your infantry on the game board.');
  const live = showTurn(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Replace one Infantry on Home One' }));
  expect(live.entry().choices).toEqual({ h1: 1 });
  await userEvent.click(screen.getByRole('button', { name: 'Take back: Replace one Infantry on Home One' }));
  expect(live.entry().choices).toBeUndefined();
});
