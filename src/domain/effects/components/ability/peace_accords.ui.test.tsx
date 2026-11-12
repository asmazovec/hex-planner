import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { bench, FAR, FARTHER, HOME, NEAR, primary, quote, TARGET } from '../kit';
import { id } from './peace_accords';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

// "After you resolve the primary or secondary ability of the "Diplomacy" strategy card: You may gain control of 1
//  planet ..."
// Checks: I choose Peace Accords in «Used» of Diplomacy's primary; it asks for the planet, offering Target Two; I press
// it and the choice is written into the entry.
// Why this is the component's own: no rule gains a planet without a landing; the planner must let the player name it.
// Pass 2 builds the choice (a group named after the ability with a button per planet) and the field `useChoices`.
test('ability:peace_accords chosen in «Used» of Diplomacy, it asks for the planet and writes it into the entry', async () => {
  const diplomacy = primary(CARD.diplomacy, { systemId: HOME });
  const xxcha = bench({ faction: 'xxcha', entries: [diplomacy], game: { map: MAP } });
  quote(xxcha.pack, id, 'You may gain control of 1 planet');
  const live = showUses(xxcha, diplomacy);
  await use('Peace Accords');
  await userEvent.click(within(screen.getByRole('group', { name: 'Peace Accords' })).getByRole('button', { name: 'Target Two' }));
  expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [id]: { planet: 't2' } });
});
