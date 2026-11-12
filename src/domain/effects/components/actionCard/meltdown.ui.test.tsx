import { expect, test } from 'vitest';
import { choose, expectShownStanding, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, DataPack, EntryBody, Game } from '../../../types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './meltdown';

uiBench();

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
const table = (game: Partial<Game>) => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  return { turn, ...bench({
    faction: 'sol', start: { hand: [id] }, entries: [turn], edit: seatRival,
    game: { opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], ...game },
  }) };
};

// "Destroy 1 space dock in a non-home system."
// Checks: I play Reactor Meltdown and choose Target One, where the opponent has a space dock; the entry keeps the
// planet and the dock is gone from the plan.
// Why no check is lifted: destroying another player's structure by a card breaks no rule; the interface has to let
// me name the dock.
test('actionCard:meltdown the opponent\'s space dock is chosen in the editor and destroyed', async () => {
  const card = table({ docks: ['t1'], planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL } });
  quote(card.pack, id, 'Destroy 1 space dock in a non-home system');
  const live = showTurn(card, card.turn);
  await play('Reactor Meltdown');
  await choose('Target One');
  expect(live.entry().choices).toEqual({ planet: 't1' });
  expect(endOf({ pack: card.pack, game: live.game() }).rivals?.[RIVAL].docks).not.toContain('t1');
});

// tirules2, Reactor Meltdown 1: "A player cannot destroy their own space dock with Reactor Meltdown."
// Checks: my own dock on Target One can still be chosen (a warning forbids nothing), and the warning stands.
// Why the check is NOT redundant here: the card is for other players' docks.
test('actionCard:meltdown my own space dock can be chosen, and its warning stands', async () => {
  const card = table({ docks: ['t1'], planetControl: { t1: 'me' } });
  showTurn(card, card.turn);
  await play('Reactor Meltdown');
  await choose('Target One');
  expectShownStanding(UNRESOLVED);
});
