import { expect, test } from 'vitest';
import { choose, expectShownStanding, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, HOME, quote } from '../kit';
import { id } from './sr';

uiBench();

/** I hold the card and a space dock on h1, in the home system; the component action has nothing chosen yet. */
const table = () => {
  const turn = componentAction(id);
  return { turn, ...bench({ faction: 'sol', expansions: ['pok'], start: { technologies: [id] }, entries: [turn], game: { docks: ['h1'], planetControl: { h1: 'me' } } }) };
};

// "ACTION: Exhaust this card to produce 1 ship in any system that contains one of your space docks."
// Checks: in the editor of the card's action I choose the home system and a destroyer; the entry keeps both, the
// destroyer stands in the system, and the cost of the ship, which nothing paid, is shown as a warning that stands.
// Why the check is redundant here: the card produces the ship by itself, in the system of my space dock, so no
// space dock is missing; the cost is not lifted (Sling Relay 1).
test('technology:sr the system and the ship are chosen in the editor, and the ship is paid for', async () => {
  const card = table();
  quote(card.pack, id, 'produce 1 ship in any system that contains one of your space docks');
  const live = showTurn(card, card.turn);
  await choose(/Home One/);
  await choose('Destroyer');
  expect(live.entry().choices).toEqual({ systemId: HOME, unit: 'destroyer' });
  expect(endOf({ pack: card.pack, game: live.game() }).systems[HOME]).toMatchObject({ destroyer: 1 });
  expectShownStanding('shortResources');
});
