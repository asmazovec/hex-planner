import { expect, test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import type { DataPack, EntryBody } from '../../../types';
import { bench, endOf, planned, quote, TARGET } from '../kit';
import { id } from './lucky';
import { choose, play, showTurn } from './turnBench';

uiBench();

const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
const table = () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  return { turn, ...bench({
    faction: 'sol', start: { hand: [id] }, entries: [turn], edit: seatRival,
    game: {
      opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], planetControl: { t1: 'me' },
      enemyUnits: { [TARGET]: { [RIVAL]: { destroyer: 1, carrier: 1 } } },
    },
  }) };
};

// "Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet you control."
// Checks: I play Lucky Shot and choose the opponent's destroyer in the target system, where I control t1; the entry
// keeps the system, the player and the unit, and the destroyer is gone from the plan.
// Why no check is lifted: destroying another player's ship by a card breaks no rule; the interface has to let me
// name the ship.
test.fails('actionCard:lucky the opponent\'s destroyer is chosen in the editor and destroyed', async () => {
  const card = table();
  quote(card.pack, id, 'Destroy 1 dreadnought, cruiser, or destroyer');
  const live = showTurn(card, card.turn);
  await play('Lucky Shot');
  await choose(/Destroyer/);
  expect(live.entry().choices).toEqual({ system: TARGET, player: RIVAL, unit: 'destroyer' });
  expect(endOf({ pack: card.pack, game: live.game() }).rivals?.[RIVAL].systems[TARGET]?.destroyer ?? 0).toBe(0);
});
