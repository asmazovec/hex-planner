import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { adjust, bench, endOf, planned, quote } from '../kit';
import { id } from './repeal';

uiBench();

const LAW = 'agenda:conventions';
const table = () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  const enacted: Entry = { ...adjust({}), gains: [LAW] };
  return { turn, ...bench({ faction: 'sol', start: { hand: [id] }, entries: [enacted, turn] }) };
};

// "Discard 1 law from play."
// Checks: I play Repeal Law and choose Conventions of War among the laws in play; the entry keeps the choice and the
// law leaves play.
// Why no check is lifted: discarding a law breaks no rule; the interface has to let me name the law.
test.fails('actionCard:repeal the law is chosen in the editor and leaves play', async () => {
  const card = table();
  quote(card.pack, id, 'Discard 1 law from play');
  const live = showTurn(card, card.turn);
  await play('Repeal Law');
  await choose('Conventions of War');
  expect(live.entry().choices).toEqual({ law: LAW });
  expect(endOf({ pack: card.pack, game: live.game() }).laws ?? []).not.toContain(LAW);
});

// Checks: chosen without a law, the card leaves the hand and the law stays.
// Why the law is NOT discarded: the card names one law, and none is chosen yet.
test('actionCard:repeal chosen without a law leaves the law in play', async () => {
  const card = table();
  const live = showTurn(card, card.turn);
  await play('Repeal Law');
  const end = endOf({ pack: card.pack, game: live.game() });
  expect(end.laws).toContain(LAW);
  expect(end.holdings.hand).not.toContain(id);
});
