import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { DataPack } from '../../../types';
import type { EntryBody } from '../../../../testing/old/domain/types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './insub';

uiBench();

const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
const table = () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  return { turn, ...bench({
    faction: 'sol', start: { hand: [id] }, entries: [turn], edit: seatRival,
    game: { opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }] },
  }) };
};

// "Remove 1 token from another player's tactic pool and return it to their reinforcements."
// Checks: I play Insubordination and choose the opponent among the other players; the entry keeps the choice and
// their tactic pool goes from 3 to 2.
// Why no check is lifted: the card changes another player's tokens and breaks no rule; the interface has to let me
// name the player.
test('actionCard:insub the opponent is chosen in the editor and loses a tactic token', async () => {
  const card = table();
  quote(card.pack, id, 'Remove 1 token from another player\'s tactic pool');
  const live = showTurn(card, card.turn);
  await play('Insubordination');
  await choose(/Rules/);
  expect(live.entry().choices).toEqual({ player: RIVAL });
  expect(endOf({ pack: card.pack, game: live.game() }).rivals?.[RIVAL].tactic).toBe(2);
});
