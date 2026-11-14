import { describe, expect, test } from 'vitest';
import type { DataPack, Entry } from '../../../types';
import { bench, effect, endOf, NEAR, quote, tactical, TARGET, using } from '../kit';
import { id } from './infiltrate';

const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
/** A carrier brings two infantry from the empty system next door and lands them on t1, the opponent's planet with a space dock and a PDS. */
const invade = (planetId = 't1') => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId, units: { infantry: 2 } }],
});
const table = (entry: Entry, hand: string[] = [id]) => bench({
  faction: 'sol', start: { hand }, entries: [entry], edit: seatRival, units: { [NEAR]: { carrier: 1, infantry: 2 } },
  game: {
    opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }],
    docks: ['t1'], pds: { t1: 1 }, planetControl: { t1: 'enemy', t2: 'enemy' }, planetOwner: { t1: RIVAL, t2: RIVAL },
  },
});

describe('actionCard:infiltrate Infiltrate', () => {
  // "Replace each PDS and space dock that is on that planet with a matching unit from your reinforcements."
  // Checks: the card named in the `uses` of the invasion that takes t1 puts my own space dock and PDS where the
  // opponent's stood.
  // Why the default does not apply here: the opponent's structures on a planet taken are destroyed (LRR 49.5.1,
  // 63.4, 79.4); the card replaces them with the player's own instead of leaving the planet bare.
  test('actionCard:infiltrate replaces the opponent\'s space dock and PDS with mine on the planet taken', () => {
    const card = table(using(invade(), id));
    quote(card.pack, id, 'Replace each PDS and space dock that is on that planet with a matching unit from your reinforcements');
    const end = endOf(card);
    expect(end.control.t1).toBe('me');
    expect(end.docks).toContain('t1');
    expect(end.pds.t1).toBe(1);
    expect(end.rivals?.[RIVAL].docks).not.toContain('t1');
  });

  // LRR 49.5.1: when a player gains control of a planet, the structures of the player who had it are destroyed.
  // Checks: the same invasion without the card leaves t1 bare.
  // Why the default is NOT lifted here: the card was not played.
  test('actionCard:infiltrate not played, the opponent\'s structures on the planet taken are destroyed', () => {
    const end = endOf(table(invade()));
    expect(end.control.t1).toBe('me');
    expect(end.docks).not.toContain('t1');
    expect(end.pds.t1 ?? 0).toBe(0);
  });

  // "... that is on that planet ..." (window: "When you gain control of a planet")
  // Checks: landing on t2, which holds no structure, the card gives nothing; t1 is not taken and keeps its own.
  // Why nothing is replaced: the card speaks of the planet gained only.
  test('actionCard:infiltrate on a planet without structures gives nothing', () => {
    const end = endOf(table(using(invade('t2'), id)));
    expect(end.docks).not.toContain('t1');
    expect(end.docks).not.toContain('t2');
    expect(end.pds.t2 ?? 0).toBe(0);
  });

  test('actionCard:infiltrate is a play effect that waives nothing', () => {
    const { pack } = table(invade());
    expect(effect(pack, id).tier).toBe('play');
  });
});
