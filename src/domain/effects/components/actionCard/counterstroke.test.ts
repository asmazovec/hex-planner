import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, NEAR, planned, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './counterstroke';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Player = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** I activated the system next to home; the Hacan then activate it too, and I play Counterstroke naming a system. */
const mine = () => tactical(NEAR);
const theirs = () => tactical(NEAR, {}, { owner: RIVAL.id });
const counter = (systemId: string) => componentAction(id, { choices: { systemId } });
const table = (entries: Entry[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries, game: { opponents: [RIVAL] } });

describe('actionCard:counterstroke Counterstroke', () => {
  // "After another player activates a system that contains 1 of your command tokens: Return that command token to
  //  your tactic pool."
  // Checks: my token leaves the system and my tactic pool is back to three.
  // Why the check is redundant here: nothing is lifted; a token leaves the board otherwise only in the status phase,
  // and here it returns to the tactic pool, which the count must know.
  test('actionCard:counterstroke returns my token from the activated system to my tactic pool', () => {
    const play = counter(NEAR);
    const card = table([mine(), theirs(), play]);
    quote(card.pack, id, 'Return that command token to your tactic pool.');
    const end = endOf(card);
    expect(end.tokensOnMap).not.toContain(NEAR);
    expect(end.tactic).toBe(3);
    expectNone(warningsOf(card, play), PLAY_CONDITION);
  });

  // The window "After another player activates a system ..." is in another player's turn; LRR 2.6: only an "ACTION"
  // card is played as a component action.
  // Checks: played after I passed, it is no action after passing.
  // Why the check is redundant here: the card is played in its window, not as a turn of mine.
  test('actionCard:counterstroke is not a turn: played after I passed it makes no warning of an action after passing', () => {
    const play = counter(NEAR);
    expectNone(warningsOf(table([mine(), planned({ type: 'pass' }, 'action'), theirs(), play]), play), 'actionAfterPass');
  });

  // "... a system that contains 1 of your command tokens ..."
  // Checks: the target, where I have no token, is warned of.
  // Why the check is NOT redundant here: the card returns a token that is in the activated system, and there is none.
  test('actionCard:counterstroke naming a system without my token is warned of', () => {
    const play = counter(TARGET);
    expectStanding(warningsOf(table([mine(), theirs(), play]), play), PLAY_CONDITION);
  });

  test('actionCard:counterstroke is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
