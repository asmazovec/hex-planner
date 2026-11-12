import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { DataPack, Entry } from '../../../types';
import { bench, endOf, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './infiltrate';

uiBench();

const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
const invade = () => tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }] });
const table = (entry: Entry) => bench({
  faction: 'sol', start: { hand: [id] }, entries: [entry], edit: seatRival, units: { [NEAR]: { carrier: 1, infantry: 2 } },
  game: {
    opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }],
    docks: ['t1'], pds: { t1: 1 }, planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL },
  },
});

// "Replace each PDS and space dock that is on that planet with a matching unit from your reinforcements."
// Checks: in «Used» of the invasion that takes Target One I choose Infiltrate; the entry names the card, and the plan
// then has my space dock and PDS on t1 where the opponent's stood.
// Why the default does not apply here: the opponent's structures on a planet taken are destroyed (LRR 49.5.1); the
// card puts the player's own in their place.
test.fails('actionCard:infiltrate named in «Used» of the invasion gives me the structures of the planet taken', async () => {
  const move = invade();
  const card = table(move);
  quote(card.pack, id, 'Replace each PDS and space dock that is on that planet');
  const live = showUses(card, move);
  await use('Infiltrate');
  expect(live.entry().uses).toEqual([id]);
  const end = endOf({ pack: card.pack, game: live.game() });
  expect(end.docks).toContain('t1');
  expect(end.pds.t1).toBe(1);
});

// LRR 49.5.1: the structures of the player who had the planet are destroyed when another player gains it.
// Checks: the same invasion with nothing in «Used» leaves t1 without structures.
// Why the default is NOT lifted here: the card was not played.
test('actionCard:infiltrate not named, the planet taken is left without structures', () => {
  const move = invade();
  const card = table(move);
  const live = showUses(card, move);
  expect(live.entry().uses ?? []).toEqual([]);
  const end = endOf({ pack: card.pack, game: live.game() });
  expect(end.docks).not.toContain('t1');
  expect(end.pds.t1 ?? 0).toBe(0);
});
