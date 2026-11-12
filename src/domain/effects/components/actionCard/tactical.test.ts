import { describe, expect, test } from 'vitest';
import type { ExtensionCode, Opponent, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, TARGET, warningsOf } from '../kit';
import { id } from './tactical';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** The Hacan hold both planets of the target, where my ship stands; Tactical Bombardment names the target. */
const bombard = () => componentAction(id, { choices: { systemId: TARGET } });
const table = (mine: UnitCounts, play = bombard()) => ({
  play,
  ...bench({
    faction: 'sol', units: { [TARGET]: mine }, start: { hand: [id] }, entries: [play],
    game: { opponents: [RIVAL], planetControl: { t1: 'enemy', t2: 'enemy' }, planetOwner: { t1: RIVAL.id, t2: RIVAL.id } },
  }),
});

describe('actionCard:tactical Tactical Bombardment', () => {
  // "ACTION: Choose 1 system that contains 1 or more of your units that have BOMBARDMENT. Exhaust each planet
  //  controlled by other players in that system."
  // Checks: my dreadnought (BOMBARDMENT 5) stands in the target; both Hacan planets there are exhausted.
  // Why the check is redundant here: nothing is lifted; the card exhausts other players' planets, which the count
  // must know so that the Hacan cannot spend them.
  test.fails('actionCard:tactical exhausts every planet of other players in a system with my BOMBARDMENT unit', () => {
    const tactical = table({ dreadnought: 1 });
    quote(tactical.pack, id, 'Exhaust each planet controlled by other players in that system.');
    expect(endOf(tactical).rivals?.[RIVAL.id].exhausted).toEqual(expect.arrayContaining(['t1', 't2']));
    expectNone(warningsOf(tactical, tactical.play), PLAY_CONDITION);
  });

  // "Choose 1 system that contains 1 or more of your units that have BOMBARDMENT."
  // Checks: with only a cruiser (no BOMBARDMENT) in the target the card is warned of.
  // Why the check is NOT redundant here: the card needs a unit with BOMBARDMENT in the system.
  test.fails('actionCard:tactical without a unit that has BOMBARDMENT in the system is warned of', () => {
    const tactical = table({ cruiser: 1 });
    expectStanding(warningsOf(tactical, tactical.play), PLAY_CONDITION);
  });

  // "... controlled by other players ..."
  // Checks: my own planet in the system stays readied.
  // Why the check is NOT redundant here: the card exhausts only other players' planets.
  test('actionCard:tactical leaves my own planets readied', () => {
    const play = bombard();
    const tactical = bench({ faction: 'sol', units: { [TARGET]: { dreadnought: 1 } }, start: { hand: [id] }, entries: [play], game: { planetControl: { t1: 'me' } } });
    expect(endOf(tactical).exhausted).not.toContain('t1');
  });

  test.fails('actionCard:tactical is a play effect', () => {
    expect(effect(table({}).pack, id).tier).toBe('play');
  });
});
