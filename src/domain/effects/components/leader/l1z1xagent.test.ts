import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './l1z1xagent';

/** The L1Z1X with the agent unlocked; `units` stand in NEAR before the entries. */
const table = (entries: Entry[], units: UnitCounts = { carrier: 1, infantry: 1 }, faction = 'l1z1x') =>
  bench({ faction, expansions: ['pok'], units: { [NEAR]: units, [HOME]: { carrier: 1, infantry: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:l1z1xagent I48S', () => {
  // "After a player activates a system: You may exhaust this card to allow that player to replace 1 of their infantry
  //  in the active system with 1 mech from their reinforcements."
  // Checks: I activate NEAR, where my carrier holds one infantry, and name the agent in «Used»: the infantry becomes a
  // mech.
  // Why nothing is waived: the agent changes the board; the replay must make the replacement.
  test.fails('leader:l1z1xagent replaces an infantry of the active system with a mech', () => {
    const activate = using(tactical(NEAR), id);
    const l1z1x = table([activate]);
    quote(l1z1x.pack, id, 'replace 1 of their infantry in the active system with 1 mech from their reinforcements');
    expect(endOf(l1z1x).systems[NEAR]).toEqual({ carrier: 1, mech: 1 });
  });

  // Checks: only one infantry is replaced, whatever stands there.
  // Why the check is NOT redundant here: the text says 1 infantry.
  test.fails('leader:l1z1xagent replaces one infantry, not two', () => {
    const activate = using(tactical(NEAR), id);
    expect(endOf(table([activate], { carrier: 1, infantry: 2 })).systems[NEAR]).toEqual({ carrier: 1, infantry: 1, mech: 1 });
  });

  // Faction note 1: "The infantry must be in the system when it is activated for it to be eligible to be replaced. It
  //  cannot be replaced if it is moved into or produced in the active system later in the turn."
  // Checks: the infantry that arrives with the move is not replaced, and the replacement that finds no infantry is
  // reported as a missing unit.
  // Why the check is NOT redundant here: the agent acts right after the activation, before the move.
  test.fails('leader:l1z1xagent an infantry moved in later is not replaced', () => {
    const activate = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }] }), id);
    const l1z1x = table([activate], {});
    expect(endOf(l1z1x).systems[NEAR]).toEqual({ carrier: 1, infantry: 1 });
    expectStanding(warningsOf(l1z1x, activate), 'unitsMissing');
  });

  // Checks: without the agent named nothing is replaced.
  // Why the check is NOT redundant here: "You may exhaust this card": not used, no mech.
  test('leader:l1z1xagent not used replaces nothing', () => {
    expect(endOf(table([tactical(NEAR)])).systems[NEAR]).toEqual({ carrier: 1, infantry: 1 });
  });

  // LRR 51.4 (Leaders): an agent is exhausted when its ability is used.
  // Checks: used twice in one round, the second use finds the agent exhausted.
  test('leader:l1z1xagent is exhausted by its use', () => {
    const second = using(tactical(HOME), id);
    expectStanding(warningsOf(table([using(tactical(NEAR), id), second]), second), 'componentExhausted');
  });

  test.fails('leader:l1z1xagent is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeDefined();
  });
});
