import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './rally';

/** `count` cruisers fly from home into the near system, where an opponent's destroyer stands. */
const move = (count: number) => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: count } }] });
const table = (entry: Entry, count: number, hand: string[] = [id]) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: count } }, start: { hand }, entries: [entry],
  game: { opponents: [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } },
});
const fleetWarnings = (entry: Entry, count: number, hand?: string[]) =>
  warningsOf(table(entry, count, hand), entry).filter(w => w.code === 'fleetPool');

describe('actionCard:rally Rally', () => {
  // "Place 2 command tokens from your reinforcements in your fleet pool."
  // Checks: Rally used in the tactical action that activates a system with an opponent's ship; five cruisers arrive
  // where a fleet pool of 3 allowed three, and no fleet pool warning is made.
  // Why the check is redundant here: the card raises the fleet pool to 5 right after the activation, before the
  // movement; five ships are within the new limit (37.1 counts the tokens in the pool, whatever brought them).
  test('actionCard:rally two more fleet pool tokens let five ships arrive in the activated system', () => {
    const entry = using(move(5), id);
    quote(table(entry, 5).pack, id, 'Place 2 command tokens from your reinforcements in your fleet pool.');
    expect(fleetWarnings(entry, 5)).toEqual([]);
  });

  // LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter ships
  //  that a player can have in a system."
  // Checks: the same five cruisers without the card are warned of against a fleet pool of 3.
  // Why the check is NOT redundant here: no card was played; the fleet pool holds its 3 tokens.
  test('actionCard:rally not played, five ships exceed the fleet pool of 3', () => {
    const entry = move(5);
    expectStanding(warningsOf(table(entry, 5), entry), 'fleetPool');
    expect(fleetWarnings(entry, 5)[0].params).toMatchObject({ ships: 5, fleet: 3 });
  });

  // "Place 2 command tokens ..."
  // Checks: with the card a sixth ship is still warned of, and the warning names the fleet pool of 5.
  // Why the check is NOT redundant here: the card adds exactly two tokens; it does not lift the limit.
  test('actionCard:rally the sixth ship is warned of against a fleet pool of 5', () => {
    const entry = using(move(6), id);
    expectStanding(warningsOf(table(entry, 6), entry), 'fleetPool');
    expect(fleetWarnings(entry, 6)[0].params).toMatchObject({ ships: 6, fleet: 5 });
  });

  // "... from your reinforcements in your fleet pool."
  // Checks: the tokens stay in the fleet pool after the action: the plan ends with 5 fleet tokens.
  // Why it matters: the tokens are placed, not lent for the action; later actions count them too.
  test('actionCard:rally the fleet pool keeps the two tokens after the action', () => {
    const entry = using(move(1), id);
    expect(endOf(table(entry, 1)).fleet).toBe(5);
  });

  // Checks: without the card the fleet pool stays at 3.
  // Why the check is NOT redundant here: no card, no tokens.
  test('actionCard:rally not played, the fleet pool stays at 3', () => {
    expect(endOf(table(move(1), 1)).fleet).toBe(3);
  });

  test.todo('actionCard:rally played on a system with no other player\'s ships is warned of: the replay checks no window of an action card yet');

  test('actionCard:rally is a play effect that lifts no check', () => {
    const { pack } = table(move(1), 1);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
