import { expect, test } from 'vitest';
import { play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { DataPack } from '../../../types';
import type { EntryBody } from '../../../../testing/old/domain/types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './industrial_initiative';

uiBench();

const industrial = (pack: DataPack) => {
  pack.planets.t1 = { ...pack.planets.t1, traits: ['industrial'] };
  pack.planets.t2 = { ...pack.planets.t2, traits: ['industrial'] };
};
const empty = () => planned({ type: 'component', note: '' } as EntryBody);
const table = (control: Record<string, 'me' | 'enemy'>) => {
  const turn = empty();
  return { turn, ...bench({ faction: 'sol', start: { hand: [id] }, entries: [turn], game: { planetControl: control }, edit: industrial }) };
};

// "Gain 1 trade good for each industrial planet you control."
// Checks: in the editor of a component action I choose Industrial Initiative from my hand; the entry plays it and the
// plan gains 2 trade goods, one for t1 and one for t2.
// Why no check is lifted: the card adds trade goods and breaks no rule; the interface only has to play it.
test('actionCard:industrial_initiative chosen in the component action gains a trade good per industrial planet', async () => {
  const card = table({ t1: 'me', t2: 'me' });
  quote(card.pack, id, 'Gain 1 trade good for each industrial planet you control');
  const live = showTurn(card, card.turn);
  await play('Industrial Initiative');
  expect(live.entry().componentId).toBe(id);
  expect(endOf({ pack: card.pack, game: live.game() }).tradeGoods).toBe(2);
});

// tirules2, Industrial Initiative 1: "A player with zero industrial planets may play Industrial Initiative."
// Checks: with no industrial planet the card is still chosen and played, and gains nothing.
// Why nothing is warned of: the play is legal and its effect is zero.
test('actionCard:industrial_initiative with no industrial planet is played from the editor and gains nothing', async () => {
  const card = table({});
  const live = showTurn(card, card.turn);
  await play('Industrial Initiative');
  expect(live.entry().componentId).toBe(id);
  const end = endOf({ pack: card.pack, game: live.game() });
  expect(end.tradeGoods).toBe(0);
  expect(end.holdings.hand).not.toContain(id);
});
