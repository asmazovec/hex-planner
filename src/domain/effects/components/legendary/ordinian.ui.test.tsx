import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { bench, planned, quote, using } from '../kit';
import { id } from './ordinian';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const table = (turn: Entry) => bench({ faction: 'sol', expansions: ['te'], entries: [turn], game: { planetControl: { ordinian: 'me' } } });

// "You may exhaust this card when you pass to draw 1 action card and gain 1 command token."
// Checks: when I pass I name the card in «Used»; it is taken, and nothing warns.
// Why no check stands: the card is mine while I control Ordinian (53.2, 53.3), and this is my pass.
test('legendary:ordinian the card is named in «Used» of my pass', async () => {
  const turn = pass();
  const ordinian = table(turn);
  const name = ordinian.pack.planets.ordinian.legendary!;
  quote(ordinian.pack, id, 'exhaust this card when you pass to draw 1 action card and gain 1 command token');
  const live = showUses(ordinian, turn);
  await use(name);
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the card in «Used» asks where the command token goes; I press «Tactic pool» and the entry keeps it.
// Why this is needed: the token lands in a pool the player chooses, and the plan counts each pool.
test('legendary:ordinian the card asks for the pool of the command token', async () => {
  const turn = using(pass(), id);
  const live = showUses(table(turn), turn);
  await userEvent.click(screen.getByRole('button', { name: 'Tactic pool' }));
  expect(live.entry()).toMatchObject({ useChoices: { [id]: { ordinianPool: 'tactic' } } });
});
