import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, expectStanding, HOME, planned, quote, warningsOf } from '../kit';
import { id } from './cladenstine';

/**
 * The agenda resolved: an entry of the agenda phase that names the card among its gains, with the outcome the player
 * chose and, for "For", the pools the two tokens leave. `choices` is not a field of an adjustment yet (pass 2).
 */
const resolved = (choices: Record<string, string | number>): Entry =>
  planned({ type: 'adjustment', label: '', delta: {}, choices } as EntryBody, 'agenda', { gains: [id] });
/** Three cruisers at home fit the fleet pool of 3 the plan starts with. */
const table = (agenda: Entry) => ({ agenda, ...bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 3 } }, entries: [agenda] }) });

describe('agenda:cladenstine Clandestine Operations', () => {
  // "Against: Each player removes 1 command token from their fleet pool and returns that token to their reinforcements."
  // Checks: the outcome "Against" takes one token from the fleet pool by itself: 3 becomes 2.
  // Why the check is redundant here: nothing is lifted; the agenda changes the command sheet, which the plan counts,
  // so the player should not have to enter the token by hand.
  test('agenda:cladenstine against takes one token from the fleet pool', () => {
    const against = table(resolved({ outcome: 'against' }));
    quote(against.pack, id, 'Each player removes 1 command token from their fleet pool');
    expect(endOf(against).fleet).toBe(2);
  });

  // LRR 37.3: a player whose fleet pool falls below the ships of a system removes the ships beyond it.
  // Checks: with three cruisers at home, the lowered pool of 2 is warned of on the agenda entry.
  // Why the check is NOT redundant here: the agenda lowers the limit; it says nothing that lets the ships stay.
  test('agenda:cladenstine against: three ships at home are beyond the lowered fleet pool', () => {
    const against = table(resolved({ outcome: 'against' }));
    expectStanding(warningsOf(against, against.agenda), 'fleetPool');
  });

  // "For: Each player removes 2 command tokens from their command sheet and returns those tokens to their reinforcements."
  // Checks: the two tokens leave the pools the player chose, one tactic and one strategy, and the fleet pool stays.
  // Why the check is redundant here: nothing is lifted; the outcome changes the pools the plan counts.
  test('agenda:cladenstine for takes the two tokens from the pools the player chose', () => {
    const forIt = table(resolved({ outcome: 'for', tactic: 1, strategy: 1 }));
    quote(forIt.pack, id, 'Each player removes 2 command tokens from their command sheet');
    expect(endOf(forIt)).toMatchObject({ tactic: 2, strategy: 1, fleet: 3 });
  });

  // Checks: "For" taken from the tactic pool leaves the fleet pool of 3, so the three cruisers are not warned of.
  // Why the check is NOT redundant here: the fleet pool check stays, it simply finds nothing beyond the limit.
  test('agenda:cladenstine for taken from the tactic pool leaves the three ships within the fleet pool', () => {
    const forIt = table(resolved({ outcome: 'for', tactic: 2 }));
    expectNone(warningsOf(forIt, forIt.agenda), 'fleetPool');
  });

  // Checks: the card is a play of the agenda entry; it lifts nothing.
  test('agenda:cladenstine is a play effect with no waiver', () => {
    const { pack } = table(resolved({ outcome: 'against' }));
    expect(effect(pack, id).tier).toBe('play');
  });
});
