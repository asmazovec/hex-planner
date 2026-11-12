import { describe, expect, test } from 'vitest';
import type { ExtensionCode, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './jamming';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** My cruiser stands in my home system; Signal Jamming names a system and the Hacan. */
const jam = (systemId: string) => componentAction(id, { choices: { systemId, player: RIVAL.id } });
const table = (play: ReturnType<typeof jam>) =>
  bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { hand: [id] }, entries: [play], game: { opponents: [RIVAL] } });

describe('actionCard:jamming Signal Jamming', () => {
  // "ACTION: Choose 1 non-home system that contains or is adjacent to 1 of your ships. Place a command token from
  //  another player's reinforcements in that system."
  // Checks: the Hacan get a command token in the system next to my home; it comes from their reinforcements, so their
  // pools stay as they were.
  // Why the check is redundant here: nothing is lifted; the card places another player's token, which only Diplomacy
  // does by the rules (32.2), and the plan must count it to warn the Hacan when they activate that system.
  test('actionCard:jamming places the other player\'s command token in a system next to my ship', () => {
    const play = jam(NEAR);
    const jamming = table(play);
    quote(jamming.pack, id, 'Place a command token from another player\'s reinforcements in that system.');
    const rival = endOf(jamming).rivals?.[RIVAL.id];
    expect(rival?.tokensOnMap).toContain(NEAR);
    expect([rival?.tactic, rival?.fleet, rival?.strategy]).toEqual([3, 3, 2]);
    expectNone(warningsOf(jamming, play), PLAY_CONDITION);
  });

  // "Choose 1 non-home system ..."
  // Checks: my home system chosen is warned of.
  // Why the check is NOT redundant here: the card names non-home systems only.
  test('actionCard:jamming in a home system is warned of', () => {
    const play = jam(HOME);
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  // "... that contains or is adjacent to 1 of your ships."
  // Checks: the target system, two systems away from my only ship, is warned of.
  // Why the check is NOT redundant here: the card reaches only systems with or next to one of my ships.
  test('actionCard:jamming in a system neither holding nor next to my ships is warned of', () => {
    const play = jam(TARGET);
    expectStanding(warningsOf(table(play), play), PLAY_CONDITION);
  });

  // Checks: the component action discards the card from my hand, as the replay already plays an action card.
  test('actionCard:jamming played leaves my hand', () => {
    expect(endOf(table(jam(NEAR))).holdings.hand).not.toContain(id);
  });

  test('actionCard:jamming is a play effect', () => {
    expect(effect(table(jam(NEAR)).pack, id).tier).toBe('play');
  });
});
