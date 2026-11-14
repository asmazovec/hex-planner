import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, NEAR, planned, quote, TARGET, tactical, warningsOf, type Bench } from '../kit';
import { id } from './vfs1';

/** The code pass 2 adds: the card's condition is not met (no mech on the planet and no infantry to remove). */
const CONDITION = 'explorationCondition' as AnyWarningCode;
/** A carrier from the next system lands `units` on Target One and gains it; the card explored is in its gains. */
const landing = (units: UnitCounts, gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 2, mech: 1 } }], landings: [{ planetId: 't1', units }],
}, gains.length > 0 ? { gains } : {});
/** The wanted shape (pass 2): what the player chose for the card, in the entry's `choices` under the card's id. */
const choosing = (entry: Entry, choice: string): Entry => ({ ...entry, choices: { [id]: choice } } as Entry);
const table = (entries: Entry[]): Bench => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 2, mech: 1 } }, entries });
const gained = (t: Bench) => endOf(t).strategy;

describe('exploration:vfs1 Volatile Fuel Source', () => {
  // "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, gain 1 command token."
  // Checks: a mech lands on Target One with an infantry; one command token goes to the strategy pool chosen, and no infantry is removed.
  // Why the check is redundant here: nothing is lifted; the plan counts the command tokens, so the token gained must be counted.
  test('exploration:vfs1 with a mech on the planet: one command token goes to the strategy pool chosen', () => {
    const entry = landing({ mech: 1, infantry: 1 }, [id]);
    const explored = table([choosing(entry, 'strategy')]);
    quote(explored.pack, id, 'If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, gain 1 command token.');
    expect(gained(explored)).toBe(gained(table([landing({ mech: 1, infantry: 1 })])) + 1);
    expect(endOf(explored).ground.t1).toEqual({ mech: 1, infantry: 1 });
  });

  // "... or if you remove 1 infantry from this planet ..."
  // Checks: two infantry land without a mech; one of them is removed and one command token goes to the strategy pool chosen.
  // Why the check is redundant here: the removal is the price the text names, so the plan makes it.
  test('exploration:vfs1 without a mech one infantry is removed from the planet', () => {
    const entry = landing({ infantry: 2 }, [id]);
    const explored = table([choosing(entry, 'strategy')]);
    expect(gained(explored)).toBe(gained(table([landing({ infantry: 2 })])) + 1);
    expect(endOf(explored).ground.t1).toEqual({ infantry: 1 });
  });

  // "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet"
  // Checks: the card named by an entry that has no ground force on a planet is warned of.
  // Why the check is NOT redundant here: neither condition of the text is met.
  test('exploration:vfs1 with no mech and no infantry on the planet is warned of', () => {
    const entry = planned({ type: 'component', note: '' } as EntryBody, 'action', { gains: [id] });
    expectStanding(warningsOf(table([choosing(entry, 'strategy')]), entry), CONDITION);
  });

  // Checks: the same landing without the card changes nothing.
  // Why nothing is validated here: no card was explored.
  test('exploration:vfs1 not explored, the landing keeps its ground forces', () => {
    expect(endOf(table([landing({ infantry: 2 })])).ground.t1).toEqual({ infantry: 2 });
  });

  test('exploration:vfs1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
