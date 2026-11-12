import { expect, test } from 'vitest';
import { play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { EntryBody } from '../../../types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './messiah';

uiBench();

const table = () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  return { turn, ...bench({ faction: 'sol', start: { hand: [id] }, entries: [turn], game: { planetControl: { t1: 'me', t2: 'enemy' } } }) };
};

// "Place 1 infantry from your reinforcements on each planet you control."
// Checks: I choose Rise of a Messiah in the editor of a component action; the plan then has one infantry on each of
// my planets h1, h2 and t1, and none on the enemy's t2.
// Why no check is lifted: placing units by a card breaks no rule; the interface only has to play it.
test('actionCard:messiah chosen in the component action places 1 infantry on each planet I control', async () => {
  const card = table();
  quote(card.pack, id, 'Place 1 infantry from your reinforcements on each planet you control');
  const live = showTurn(card, card.turn);
  await play('Rise of a Messiah');
  expect(live.entry().componentId).toBe(id);
  const { ground } = endOf({ pack: card.pack, game: live.game() });
  expect([ground.h1?.infantry, ground.h2?.infantry, ground.t1?.infantry, ground.t2?.infantry ?? 0]).toEqual([1, 1, 1, 0]);
});
