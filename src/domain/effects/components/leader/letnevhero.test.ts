import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, expectWaived, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './letnevhero';

/** Eight cruisers arrive where the Letnev fleet pool of 3 (5 with Armada) lets five stand. */
const fleet = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 8 } }] });
const letnev = (rounds: Parameters<typeof bench>[0]['rounds'], leaders: Record<string, 'unlocked'> = { [id]: 'unlocked' }) =>
  bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 8 } }, start: { leaders }, rounds });

describe('leader:letnevhero Darktalon Treilla — Dark Matter Affinity', () => {
  // "ACTION: Place this card near the game board. the number of non-fighter ships you can have in systems is not
  //  limited by laws or by the number of command tokens in your fleet pool during this game round."
  // Checks: the hero is played by a component action and lifts the fleet pool for the rest of that round.
  // Why the check is redundant here: the fleet pool check (37.1) compares the ships of a system with the command
  // tokens of the fleet pool, and the card says outright that this number does not limit the ships this round.
  test('leader:letnevhero played this round lifts the fleet pool check of a later tactical action', () => {
    const hero = componentAction(id);
    const move = fleet();
    const table = letnev([[hero, move]]);
    quote(table.pack, id, 'is not limited by laws or by the number of command tokens in your fleet pool during this game round');
    expectWaived(warningsOf(table, move), 'fleetPool', id);
  });

  // LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter
  //  ships that a player can have in a system."
  // Checks: the hero only held, not played, lifts nothing.
  // Why the check is NOT redundant here: the ability is an ACTION; until it is played the rule stands as written.
  test('leader:letnevhero held but not played leaves the fleet pool check standing', () => {
    const move = fleet();
    expectStanding(warningsOf(letnev([[move]]), move), 'fleetPool');
  });

  // "... during this game round. At the end of that game round, purge this card."
  // Checks: the waiver ends with the round in which the hero was played.
  // Why the check is NOT redundant here: the next round is outside the card's "this game round".
  test('leader:letnevhero played in round 1 no longer lifts the fleet pool in round 2', () => {
    const move = fleet();
    expectStanding(warningsOf(letnev([[componentAction(id)], [move]]), move), 'fleetPool');
  });

  // Checks: the action that happens before the hero is played is not covered.
  // Why the check is NOT redundant here: the card takes effect when its action is resolved, not earlier in the round.
  test('leader:letnevhero does not lift the fleet pool of an action taken before it', () => {
    const move = fleet();
    expectStanding(warningsOf(letnev([[move, componentAction(id)]]), move), 'fleetPool');
  });

  // LRR 51.12 with the card's "purge this card": a hero is spent by its ability.
  // Checks: playing the hero purges it, so a second play is warned about; the plan forbids nothing.
  test('leader:letnevhero is purged by its play', () => {
    const again = componentAction(id);
    const table = letnev([[componentAction(id), again]]);
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test.todo('leader:letnevhero at the end of the round the ships beyond the fleet pool are removed: the plan has no end-of-round removal yet');

  test('leader:letnevhero is a play effect that waives for the round', () => {
    const { pack } = letnev([[]]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['fleetPool', 'round']]);
  });
});
