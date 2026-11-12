import { expect, test } from 'vitest';
import { expectShownStanding, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, EntryBody } from '../../../types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './mining_initiative';
import { choose, play, showTurn } from './turnBench';

uiBench();

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const table = () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  return { turn, ...bench({ faction: 'sol', start: { hand: [id] }, entries: [turn] }) };
};

// "Gain trade goods equal to the resource value of 1 planet you control."
// Checks: I play the card and choose Home One (3 resources) among the planets it offers; the entry keeps the choice and
// the plan gains 3 trade goods.
// Why no check is lifted: the card adds trade goods and breaks no rule; the interface has to let me name the planet.
test.fails('actionCard:mining_initiative the planet is chosen in the editor and its resources are gained', async () => {
  const card = table();
  quote(card.pack, id, 'Gain trade goods equal to the resource value of 1 planet you control');
  const live = showTurn(card, card.turn);
  await play('Mining Initiative');
  await choose('Home One');
  expect(live.entry().choices).toEqual({ planet: 'h1' });
  expect(endOf({ pack: card.pack, game: live.game() }).tradeGoods).toBe(3);
});

// "... 1 planet you control." LRR 2.6.1: a component action that cannot be resolved completely is not resolved.
// Checks: Target One, which I do not control, can be chosen all the same (a warning forbids nothing), and the warning
// stands in the block of the component.
// Why the check is NOT redundant here: the card names only planets the player controls.
test.fails('actionCard:mining_initiative a planet I do not control can be chosen, and its warning stands', async () => {
  const card = table();
  const live = showTurn(card, card.turn);
  await play('Mining Initiative');
  await choose('Target One');
  expect(live.entry().choices).toEqual({ planet: 't1' });
  expectShownStanding(UNRESOLVED);
});

// Checks: the card is chosen from the hand in the editor of a component action; without a planet it gains nothing.
// Why nothing is gained: the amount is the value of the planet chosen, and there is none yet.
test('actionCard:mining_initiative chosen without a planet gains nothing yet', async () => {
  const card = table();
  const live = showTurn(card, card.turn);
  await play('Mining Initiative');
  expect(live.entry().componentId).toBe(id);
  expect(endOf({ pack: card.pack, game: live.game() }).tradeGoods).toBe(0);
});
