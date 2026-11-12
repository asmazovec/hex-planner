import { expect, test } from 'vitest';
import { choose, expectShownStanding, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './nanomachines';

uiBench();

const table = (entry = componentAction(id)) =>
  ({ entry, ...bench({ faction: 'ralnel', expansions: ['te'], start: { technologies: [id] }, entries: [entry], game: { planetControl: { h1: 'me' } } }) });

// "ACTION: Exhaust this card to place 1 PDS on a planet you control."
// Checks: in the editor of the component action that plays Nanomachines I choose a planet I control for the PDS; it
// is written into `choices.pds` and the PDS stands on the planet.
// Why the check is redundant here: the planet is one I control, so no placement rule is broken.
test('technology:nanomachines the PDS is placed on a planet chosen in the editor of the component action', async () => {
  const card = table();
  quote(card.pack, id, 'Exhaust this card to place 1 PDS on a planet you control');
  const live = showTurn(card, card.entry);
  await choose('Home One');
  expect(live.entry().choices).toEqual({ pds: 'h1' });
  expect(endOf({ pack: card.pack, game: live.game() }).pds.h1).toBe(1);
});

// Checks: a planet I do not control is chosen, and the editor shows the placement warning standing.
// Why the check is NOT redundant here: the technology places on a planet the player controls only.
test('technology:nanomachines a planet I do not control shows structureNotControlled standing', async () => {
  const card = table();
  showTurn(card, card.entry);
  await choose('Target One');
  expectShownStanding('structureNotControlled');
});
