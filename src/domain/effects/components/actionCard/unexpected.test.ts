import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './unexpected';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;

/** My tactical action activates the system next to home; Unexpected Action then names a system. */
const unexpected = (systemId: string) => componentAction(id, { choices: { systemId } });
const table = (entries: Entry[]) => bench({ faction: 'sol', start: { hand: [id] }, entries });

describe('actionCard:unexpected Unexpected Action', () => {
  // "ACTION: Remove 1 of your command tokens from the game board and return it to your reinforcements."
  // Checks: my token leaves the activated system; it goes to the reinforcements, so the tactic pool stays at two.
  // Why the check is redundant here: nothing is lifted; a token leaves the board otherwise only in the status phase
  // (81.4), and the count must know the system is free to be activated again.
  test('actionCard:unexpected returns my command token from the board to my reinforcements', () => {
    const play = unexpected(NEAR);
    const table1 = table([tactical(NEAR), play]);
    quote(table1.pack, id, 'Remove 1 of your command tokens from the game board and return it to your reinforcements.');
    const end = endOf(table1);
    expect(end.tokensOnMap).not.toContain(NEAR);
    expect(end.tactic).toBe(2);
    expectNone(warningsOf(table1, play), PLAY_CONDITION);
  });

  // Checks: the system freed by the card can be activated again without the warning that it holds my token.
  // Why the check is redundant here: the token that LRR 5.2 looks for is no longer there.
  test('actionCard:unexpected the freed system is activated again without warning', () => {
    const again = tactical(NEAR);
    expectNone(warningsOf(table([tactical(NEAR), unexpected(NEAR), again]), again), 'systemHasToken');
  });

  // Note 1 of the card: "Unexpected Action cannot be played by a player with zero command tokens on the game board."
  // Checks: a system without my token named is warned of.
  // Why the check is NOT redundant here: the card removes one of my tokens, and there is none there.
  test('actionCard:unexpected naming a system without my token is warned of', () => {
    const play = unexpected(TARGET);
    expectStanding(warningsOf(table([tactical(NEAR), play]), play), PLAY_CONDITION);
  });

  test('actionCard:unexpected is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
