import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, HOME, planned, quote, warningsOf } from '../kit';
import { id } from './grant_reallocation';

/** The agenda resolved for its owner, the elected player, with the technology they chose among its gains. */
const elected = (technology: string): Entry =>
  planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id, technology] });
const table = (entries: Entry[], cruisers = 0) =>
  bench({ faction: 'sol', expansions: ['pok'], units: cruisers ? { [HOME]: { cruiser: cruisers } } : {}, entries });

/** E-Res Siphons asks for 2 cybernetic technologies, Light/Wave Deflector for 3 propulsion, Sarween Tools for none (Gravity Drive asks for 1 propulsion). */
const ERS = 'technology:ers';
const LWD = 'technology:lwd';
const ST = 'technology:st';

describe('agenda:grant_reallocation Research Grant Reallocation', () => {
  // "The elected player gains any 1 technology of their choice. Then, for each prerequisite on that technology, they
  //  remove 1 token from their fleet pool and return it to their reinforcements."
  // Checks: E-Res Siphons is gained and its 2 prerequisites take 2 tokens from the fleet pool: 3 becomes 1.
  // Why the check is redundant here: nothing is lifted; the agenda changes the fleet pool, which the plan counts.
  test('agenda:grant_reallocation takes a fleet pool token for each prerequisite of the technology gained', () => {
    const t = table([elected(ERS)]);
    quote(t.pack, id, 'for each prerequisite on that technology, they remove 1 token from their fleet pool');
    const end = endOf(t);
    expect(end.holdings.technologies).toContain(ERS);
    expect(end.fleet).toBe(1);
  });

  // LRR 37.3: ships beyond the fleet pool are removed.
  // Checks: three cruisers at home are beyond the pool of 1 after E-Res Siphons, on the agenda entry.
  // Why the check is NOT redundant here: the agenda lowers the limit, it does not let the ships stay.
  test('agenda:grant_reallocation ships beyond the lowered fleet pool are warned of', () => {
    const agenda = elected(ERS);
    const t = table([agenda], 3);
    expectStanding(warningsOf(t, agenda), 'fleetPool');
  });

  // Rulings: "If a player must remove more command tokens than they have in their fleet pool, they remove all their
  //  command tokens from their fleet pool instead."
  // Checks: with 2 tokens left, Light/Wave Deflector (3 prerequisites) leaves the pool at 0, and no negative pool is warned of.
  // Why the check is redundant here: the pool cannot go below 0, so the negative pool check has nothing to find.
  test('agenda:grant_reallocation never takes the fleet pool below 0', () => {
    const agenda = elected(LWD);
    const t = table([adjust({ fleet: -1 }), agenda]);
    expect(endOf(t).fleet).toBe(0);
    expectNone(warningsOf(t, agenda), 'poolNegative');
  });

  // Checks: Sarween Tools has no prerequisite, so the fleet pool keeps its 3 tokens.
  // Why the check is NOT redundant here: the number of tokens is the number of prerequisites, which here is none.
  test('agenda:grant_reallocation a technology with no prerequisite costs no token', () => {
    const t = table([elected(ST)]);
    expect(endOf(t).fleet).toBe(3);
    expect(endOf(t).holdings.technologies).toContain(ST);
  });

  // Checks: the card is played by the agenda entry.
  test('agenda:grant_reallocation is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
