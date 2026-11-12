import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, DataPack, Entry, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './lucky';

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
/** I control t1 of the target system; the opponent's ships stand where the test puts them. */
const table = (entries: Entry[], theirs: Record<string, UnitCounts> = { [TARGET]: { destroyer: 1, carrier: 1 } }, hand: string[] = [id]) => bench({
  faction: 'sol', start: { hand }, entries, edit: seatRival,
  game: {
    opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], planetControl: { t1: 'me' },
    enemyUnits: Object.fromEntries(Object.entries(theirs).map(([slot, units]) => [slot, { [RIVAL]: units }])),
  },
});
const shot = (system: string, unit: string) => componentAction(id, { choices: { system, player: RIVAL, unit } });

describe('actionCard:lucky Lucky Shot', () => {
  // "Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet you control."
  // Checks: the opponent's destroyer in the target system, where I control t1, is destroyed; their carrier stays.
  // Why no check is lifted: destroying another player's ship by a card breaks no rule; the board is what is counted.
  test.fails('actionCard:lucky destroys the chosen destroyer in a system with a planet I control', () => {
    const play = shot(TARGET, 'destroyer');
    const card = table([play]);
    quote(card.pack, id, 'Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet you control');
    const there = endOf(card).rivals?.[RIVAL].systems[TARGET] ?? {};
    expect(there.destroyer ?? 0).toBe(0);
    expect(there.carrier).toBe(1);
    expectNone(warningsOf(card, play), UNRESOLVED);
  });

  // "... in a system that contains a planet you control." LRR 2.6.1: a component action that cannot be resolved
  //  completely is not resolved.
  // Checks: a destroyer in the empty system next to home, with no planet at all, is chosen: the play is warned of.
  // Why the check is NOT redundant here: the card reaches only systems with a planet the player controls.
  test.fails('actionCard:lucky in a system without a planet I control is warned of', () => {
    const play = shot(NEAR, 'destroyer');
    expectStanding(warningsOf(table([play], { [NEAR]: { destroyer: 1 } }), play), UNRESOLVED);
  });

  // "Destroy 1 dreadnought, cruiser, or destroyer ..."
  // Checks: the carrier is chosen: the play is warned of.
  // Why the check is NOT redundant here: the card names three ship types; a carrier is none of them.
  test.fails('actionCard:lucky on a carrier is warned of: only a dreadnought, cruiser or destroyer', () => {
    const play = shot(TARGET, 'carrier');
    expectStanding(warningsOf(table([play]), play), UNRESOLVED);
  });

  // Checks: the card only held destroys nothing.
  // Why nothing is destroyed: the card is an ACTION and acts only when played.
  test('actionCard:lucky held but not played destroys nothing', () => {
    expect(endOf(table([])).rivals?.[RIVAL].systems[TARGET]?.destroyer).toBe(1);
  });

  test.fails('actionCard:lucky is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
