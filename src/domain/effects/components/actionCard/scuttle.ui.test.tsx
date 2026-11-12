import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, HOME, quote } from '../kit';
import { id } from './scuttle';

uiBench();

// "Choose 1 or 2 of your non-fighter ships on the game board and return them to your reinforcements."
// Checks: the editor of the component action that plays the card offers my non-fighter ships by system (no fighter),
// and a press chooses a cruiser; it is kept in the entry's choices under the ship and its system (a `counts` choice).
// Why the check is redundant here: nothing is lifted; the player must be able to say which ships the card returns.
test('actionCard:scuttle the component action offers the ships of the home system to return', async () => {
  const entry = componentAction(id);
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, units: { [HOME]: { cruiser: 1, fighter: 1 } }, entries: [entry] });
  quote(table.pack, id, 'return them to your reinforcements');
  const live = showTurn(table, entry);
  expect(screen.queryByRole('button', { name: 'Return one Fighter' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Return one Cruiser' }));
  expect(live.entry().choices).toEqual({ [`cruiser@${HOME}`]: 1 });
});
