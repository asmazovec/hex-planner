import { describe, expect, test } from 'vitest';
import type { ExtensionCode, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './war_effort';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;

/** My ships stand next to home; War Effort names a system. */
const effort = (systemId: string) => componentAction(id, { choices: { systemId } });
const table = (play: ReturnType<typeof effort>, near: UnitCounts = { cruiser: 1 }) =>
  bench({ faction: 'sol', units: { [NEAR]: near }, start: { hand: [id] }, entries: [play] });

describe('actionCard:war_effort War Effort', () => {
  // "ACTION: Place 1 cruiser from your reinforcements in a system that contains 1 or more of your ships."
  // Checks: a cruiser joins my cruiser next to home.
  // Why the check is redundant here: nothing is lifted; the cruiser is placed, not produced, so no production value,
  // cost or space dock is asked.
  test.fails('actionCard:war_effort places a cruiser where my ships are', () => {
    const play = effort(NEAR);
    const card = table(play);
    quote(card.pack, id, 'Place 1 cruiser from your reinforcements in a system that contains 1 or more of your ships.');
    expect(endOf(card).systems[NEAR]).toEqual({ cruiser: 2 });
    expectNone(warningsOf(card, play), PLAY_CONDITION);
  });

  // "... in a system that contains 1 or more of your ships."
  // Checks: the target, where I have no ships, is warned of.
  // Why the check is NOT redundant here: the card places only beside my ships.
  test.fails('actionCard:war_effort in a system without my ships is warned of', () => {
    const play = effort(TARGET);
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  // LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter ships
  //  that a player can have in a system."
  // Checks: three cruisers and a fourth placed by the card exceed my fleet pool of three; the warning stands.
  // Why the check is NOT redundant here: the card places a ship, it does not lift the fleet pool.
  test.fails('actionCard:war_effort beyond the fleet pool leaves the fleet pool warning standing', () => {
    const play = effort(NEAR);
    expectStanding(warningsOf(table(play, { cruiser: 3 }), play), 'fleetPool');
  });

  test.fails('actionCard:war_effort is a play effect', () => {
    expect(effect(table(effort(NEAR)).pack, id).tier).toBe('play');
  });
});
