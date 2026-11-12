import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './firmamenthero';

const firmament = (entries: Parameters<typeof bench>[0]['entries'] = []) =>
  bench({ faction: 'firmament', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:firmamenthero Sharsiss', () => {
  // "ACTION: Place 1 of your plot cards in play with any other player's control token on it."
  // Checks: the hero is a reminder of the component action and lifts no check.
  // Why nothing is validated: plot cards and the control tokens on them are not tracked by the plan.
  test('leader:firmamenthero is a reminder of the component action and waives nothing', () => {
    const { pack } = firmament();
    quote(pack, id, 'one plot cannot have two of the same player\'s tokens');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "Then, purge this card."
  // Checks: the hero is purged by its action, so a second play warns that it is no longer held.
  // Why the check is NOT redundant here: a purged hero is gone for the rest of the game (LRR 51.12).
  test('leader:firmamenthero is purged by its play', () => {
    const again = componentAction(id);
    expectStanding(warningsOf(firmament([componentAction(id), again]), again), 'componentNotHeld');
  });
});
