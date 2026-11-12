import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './solhero';

const first = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
const sol = (entries: Entry[], leaders: Record<string, 'unlocked'> = { [id]: 'unlocked' }) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { leaders }, entries });

describe('leader:solhero Jace X, 4th Air Legion — Helio Command Array', () => {
  // "ACTION: Remove each of your command tokens from the game board and return them to your reinforcements."
  // Checks: after the hero, the system activated earlier this round is activated again and no warning is made.
  // Why the check is redundant here: 5.2 forbids activating a system that holds the player's command token; the hero
  // took that token off the board, so the system holds none.
  test.fails('leader:solhero lets a system activated before it be activated again', () => {
    const again = tactical(NEAR);
    const table = sol([first(), componentAction(id), again]);
    quote(table.pack, id, 'Remove each of your command tokens from the game board and return them to your reinforcements.');
    expectNone(warningsOf(table, again), 'systemHasToken');
  });

  // LRR 58.4: ships in a system that holds the player's command token cannot move.
  // Checks: after the hero the cruiser leaves the system activated before; its move is not warned of.
  // Why the check is redundant here: the token that held the ships is back in reinforcements.
  test.fails('leader:solhero lets ships leave a system that was activated before it', () => {
    const onward = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const table = sol([first(), componentAction(id), onward]);
    expectNone(warningsOf(table, onward), 'sourceActivated');
    expect(endOf(table).tokensOnMap).toEqual([TARGET]);
  });

  // LRR 5.2 / 89.1.
  // Checks: without the hero the second activation of the same system is warned of.
  // Why the check is NOT redundant here: the token stands where it was placed until the status phase.
  test('leader:solhero not played, the second activation stands warned of', () => {
    const again = tactical(NEAR);
    expectStanding(warningsOf(sol([first(), again]), again), 'systemHasToken');
  });

  // Checks: the hero removes the tokens on the board when it is played, not those placed after it.
  // Why the check is NOT redundant here: an activation after the hero places a new token, which stands.
  test('leader:solhero does not clear a token placed after it', () => {
    const again = tactical(NEAR);
    expectStanding(warningsOf(sol([componentAction(id), first(), again]), again), 'systemHasToken');
  });

  // LRR 51.12 with "Then, purge this card."
  // Checks: a second play of the hero is warned of: it is purged.
  test('leader:solhero is purged by its play', () => {
    const second = componentAction(id);
    quote(sol([]).pack, id, 'Then, purge this card.');
    expectStanding(warningsOf(sol([componentAction(id), second]), second), 'componentNotHeld');
  });

  // Checks: the hero changes the board when it is played: a `play`.
  test.fails('leader:solhero is a play effect', () => {
    expect(effect(sol([]).pack, id).tier).toBe('play');
  });
});
