import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { choose, showUses, uiBench } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, endOf, NEAR, quote, tactical, using } from '../kit';
import { id } from './spynet';

uiBench();

const YSSARIL: Player = { id: 'o1', faction: 'yssaril', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const CARD = 'actionCard:abs';

// "Choose 1 of those cards and add it to your hand."
// Checks: Spy Net named in «Used» of my turn offers the cards of the Yssaril player's hand; I press one, the entry
// keeps it for the note alone, and the card is in my hand and out of theirs.
// Why the check is redundant here: an action card otherwise changes hands only in a transaction (94.3); the note
// moves it, so the interface has to let the player name the card.
test('promissory:spynet offers the Yssaril hand in «Used» and moves the chosen card', async () => {
  const entry = using(tactical(NEAR), NOTE);
  const table = bench({
    faction: 'sol', units: { [NEAR]: { carrier: 1 } }, entries: [entry],
    game: { opponents: [YSSARIL], start: { me: { promissory: [NOTE] }, opponents: { o1: { hand: [CARD] } } } },
  });
  quote(table.pack, id, 'Choose 1 of those cards and add it to your hand.');
  const live = showUses(table, entry);
  await choose(componentById(table.pack, CARD)!.name, 'Card from the hand');
  expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [NOTE]: { card: CARD } });
  const end = endOf({ pack: table.pack, game: live.game() });
  expect(end.holdings.hand).toContain(CARD);
  expect(end.rivals?.o1.holdings.hand).not.toContain(CARD);
});

// Spy Net: "Look at the Yssaril player's hand of action cards." Checks: a rival (Sol) names the note of mine (I am
// Yssaril) in «Used» of its own entry: the choice offers MY hand, not the rival's own.
// Why the check is NOT redundant here: the note's address is `me`, which for a rival's entry is not the rival's board.
test('promissory:spynet named in «Used» of a rival\'s entry offers the Yssaril hand', async () => {
  const rival: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
  const mine = 'actionCard:abs';
  const theirs = 'actionCard:bribery';
  const entry = { ...using(tactical(NEAR), `${id}@me`), owner: 'o1' } as Entry;
  const table = bench({
    faction: 'yssaril', entries: [entry],
    game: { opponents: [rival], start: { me: { hand: [mine] }, opponents: { o1: { promissory: [`${id}@me`], hand: [theirs] } } } },
  });
  showUses(table, entry);
  expect(screen.queryByRole('button', { name: componentById(table.pack, theirs)!.name })).toBeNull();
  expect(screen.getByRole('button', { name: componentById(table.pack, mine)!.name })).toBeTruthy();
});
