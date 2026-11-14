import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './armada';

const arrive = (cruisers: number) => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: cruisers } }] });
const table = (faction: string, cruisers: number, move = arrive(cruisers)) =>
  ({ move, ...bench({ faction, units: { [HOME]: { cruiser: cruisers } }, entries: [move] }) });

describe('ability:armada Armada', () => {
  // "The maximum number of non-fighter ships you can have in each system is equal to 2 more than the number of tokens
  //  in your fleet pool"
  // Checks: with 3 tokens in the fleet pool five Letnev ships stand in a system and no fleet pool warning is made.
  // Why the default limit does not apply: the ability does not lift the check, it changes its number (37.1 counts
  // the tokens, Armada adds 2), so this is a `modify` of `fleetLimit` and not a waiver: nothing is listed as waived.
  test('ability:armada lets two more ships stand than the fleet pool has tokens', () => {
    const five = table('letnev', 5);
    quote(five.pack, id, 'is equal to 2 more than the number of tokens in your fleet pool');
    expectNone(warningsOf(five, five.move), 'fleetPool');
  });

  // Checks: the sixth ship is beyond the changed limit, and the warning names the limit of 5.
  // Why the check is NOT redundant here: Armada raises the limit, it does not remove it.
  test('ability:armada still warns of a sixth ship, against the limit of five', () => {
    const six = table('letnev', 6);
    const warnings = warningsOf(six, six.move);
    expectStanding(warnings, 'fleetPool');
    expect(warnings.find(w => w.code === 'fleetPool')?.params).toMatchObject({ ships: 6, fleet: 5 });
  });

  // LRR 37.1: "The number of command tokens in a player's fleet pool indicates the maximum number of non-fighter
  //  ships that a player can have in a system."
  // Checks: the ability is the Letnev's own; another faction with the same board is over its pool with four ships.
  test('ability:armada is in force for the Barony of Letnev only', () => {
    const sol = table('sol', 4);
    expect(warningsOf(sol, sol.move).find(w => w.code === 'fleetPool')?.params).toMatchObject({ ships: 4, fleet: 3 });
  });

  test('ability:armada is a passive effect with no waiver', () => {
    const { pack } = table('letnev', 1);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
