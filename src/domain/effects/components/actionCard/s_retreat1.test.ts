import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, planned, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './s_retreat1';

/** The code pass 2 adds for a played card whose own condition is not met (see the report of batch 21). */
const PLAY_CONDITION = 'playCondition' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** My two cruisers attack the Hacan cruiser in the target; at the start of a combat round I play Skilled Retreat. */
const attack = () => tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }] });
const retreat = (to: string) => componentAction(id, { choices: { from: TARGET, to } });
const table = (entries: Entry[], enemy: Record<string, number> = {}) => bench({
  faction: 'sol', units: { [NEAR]: { cruiser: 2 } }, start: { hand: [id] }, entries,
  game: { opponents: [RIVAL], enemyUnits: { [TARGET]: { [RIVAL.id]: { cruiser: 1 } }, ...(enemy.near ? { [NEAR]: { [RIVAL.id]: { cruiser: enemy.near } } } : {}) } },
});

describe('actionCard:s_retreat1 Skilled Retreat', () => {
  // "At the start of a combat round: Move all of your ships from the active system into an adjacent system that does
  //  not contain another player's ships. The space combat ends in a draw. Then, place a command token from your
  //  reinforcements in that system."
  // Checks: my cruisers leave the target for the empty system beyond it, and my command token from the reinforcements
  // stands there; my pools pay only for the activation.
  // Why the check is redundant here: nothing is lifted; the move is not a movement of a tactical action (not a
  // retreat either, by the card's notes), so no move value or route is asked.
  test.fails('actionCard:s_retreat1 moves all my ships into the adjacent system and places my token there', () => {
    const play = retreat(FAR);
    const skilled = table([attack(), play]);
    quote(skilled.pack, id, 'Move all of your ships from the active system into an adjacent system that does not contain another player\'s ships.');
    const end = endOf(skilled);
    expect(end.systems[TARGET] ?? {}).toEqual({});
    expect(end.systems[FAR]).toEqual({ cruiser: 2 });
    expect(end.tokensOnMap).toEqual(expect.arrayContaining([TARGET, FAR]));
    expect(end.tactic).toBe(2);
    expectNone(warningsOf(skilled, play), PLAY_CONDITION);
  });

  // "... into an adjacent system that does not contain another player's ships."
  // Checks: the system I came from, where the Hacan now also stand, is warned of.
  // Why the check is NOT redundant here: the card forbids a system with another player's ships.
  test.fails('actionCard:s_retreat1 into a system with another player\'s ships is warned of', () => {
    const play = retreat(NEAR);
    expectStanding(warningsOf(table([attack(), play], { near: 1 }), play), PLAY_CONDITION);
  });

  // "... into an adjacent system ..."
  // Checks: a system two steps from the active one is warned of.
  // Why the check is NOT redundant here: the card moves the ships one system only.
  test.fails('actionCard:s_retreat1 into a system that is not adjacent is warned of', () => {
    const play = retreat(FARTHER);
    expectStanding(warningsOf(table([attack(), play]), play), PLAY_CONDITION);
  });

  // The window "At the start of a combat round" is not an action (LRR 2.6: only an "ACTION" card is played as a
  // component action).
  // Checks: the Hacan attack my cruisers after I passed; I retreat home as the defender, which is no action after passing.
  // Why the check is redundant here: the card is played in a window of combat, not as a turn of mine.
  test('actionCard:s_retreat1 is not a turn: played after I passed it makes no warning of an action after passing', () => {
    const theirs = tactical(NEAR, { moves: [{ from: TARGET, units: { cruiser: 1 } }] }, { owner: RIVAL.id });
    const play = componentAction(id, { choices: { from: NEAR, to: HOME } });
    const pass = planned({ type: 'pass' }, 'action');
    expectNone(warningsOf(table([pass, theirs, play]), play), 'actionAfterPass');
  });

  test.fails('actionCard:s_retreat1 is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
