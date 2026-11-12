import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { Opponent } from '../../../types';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './mi';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const CARD = 'actionCard:abs';

// "Choose 1 of those cards and add it to your hand."
// Checks: I play Mageon Implants, choose the Sol player and then a card of their hand; the entry keeps both, and the
// card is in my hand and out of theirs.
// Why the check is redundant here: an action card otherwise changes hands only in a transaction with a neighbour
// (94.3); the technology takes it from any player, so the interface has to let the player name whose and which.
test('technology:mi asks whose hand and which card and moves it', async () => {
  const turn = componentAction(undefined as unknown as string);
  const table = bench({
    faction: 'yssaril', entries: [turn],
    game: { opponents: [RIVAL], start: { me: { technologies: [id] }, opponents: { o1: { hand: [CARD] } } } },
  });
  quote(table.pack, id, 'Choose 1 of those cards and add it to your hand.');
  const live = showTurn(table, turn);
  await play('Mageon Implants');
  await choose(/Sol/, 'Whose hand');
  await choose(componentById(table.pack, CARD)!.name, 'Card from the hand');
  expect(live.entry().choices).toEqual({ from: 'o1', card: CARD });
  const end = endOf({ pack: table.pack, game: live.game() });
  expect(end.holdings.hand).toContain(CARD);
  expect(end.rivals?.o1.holdings.hand).not.toContain(CARD);
});
