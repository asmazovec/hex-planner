import { describe, expect, test } from 'vitest';
import type { Entry, StartHoldings, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './yso';

/**
 * A tactical action in the home system that produces one infantry at the dock of Home One and names Yin Spinner Omega
 * in its `uses`, with where its two infantry go. `choices` on a tactical entry is what pass 2 adds: today only a
 * component action carries choices, so the field is written through a cast.
 */
const produce = (choices: Record<string, string | number> | null, production: UnitCounts = { infantry: 1 }): Entry =>
  ({ ...using(tactical(HOME, { production, payment: { planets: ['h1'], tradeGoods: 0 } }), id), ...(choices ? { choices } : {}) } as Entry);
const table = (entry: Entry, start: StartHoldings = { technologies: [id] }) =>
  bench({ faction: 'yin', units: { [NEAR]: { cruiser: 1 } }, start, entries: [entry], game: { docks: ['h1'] } });

describe('technology:yso Yin Spinner Omega', () => {
  // "After you produce units, place up to 2 infantry from your reinforcements on any planet you control"
  // Checks: after the production at Home One, two infantry from the reinforcements stand on Home Two, beside the one
  // produced on Home One.
  // Why the check is redundant here: units otherwise enter the board only by production at a unit with Production
  // (67.1, 68.3: on the dock's planet), and these two are placed, not produced: no cost, no Production value, and on
  // any planet the Yin control (Yin notes, Yin Spinner 1).
  test('technology:yso places two infantry on a planet the Yin control after producing', () => {
    const t = table(produce({ place: 'h2', count: 2 }));
    quote(t.pack, id, 'place up to 2 infantry from your reinforcements on any planet you control');
    const end = endOf(t);
    expect(end.ground.h1?.infantry).toBe(1);
    expect(end.ground.h2?.infantry).toBe(2);
  });

  // "... or in any space area that contains 1 or more of your ships."
  // Checks: the two infantry go into the space area of the next system, where a Yin cruiser stands.
  // Why the check is redundant here: the card names any space area with the Yin's ships, not only the active system.
  test('technology:yso places the infantry in a space area with a Yin ship', () => {
    const end = endOf(table(produce({ place: NEAR, count: 2 })));
    expect(end.systems[NEAR]?.infantry).toBe(2);
  });

  // Checks: a planet the Yin do not control gets nothing.
  // Why the check is NOT redundant here: "any planet you control" is the card's own limit.
  test('technology:yso places nothing on a planet the Yin do not control', () => {
    const end = endOf(table(produce({ place: 't1', count: 2 })));
    expect(end.ground.t1?.infantry ?? 0).toBe(0);
    expect(end.systems[TARGET]?.infantry ?? 0).toBe(0);
  });

  // Checks: named by an action that produces nothing, it places nothing.
  // Why the check is NOT redundant here: "After you produce units" is the card's trigger.
  test('technology:yso without a production places nothing', () => {
    const end = endOf(table(produce({ place: 'h2', count: 2 }, {})));
    expect(end.ground.h2?.infantry ?? 0).toBe(0);
  });

  // Checks: named without being researched it is warned of as any component not held.
  // Why the check is NOT redundant here: the technology must be owned to be used.
  test('technology:yso not researched is warned of', () => {
    const entry = produce({ place: 'h2', count: 2 });
    expectStanding(warningsOf(table(entry, {}), entry), 'componentNotHeld');
  });

  test('technology:yso is a play effect', () => {
    const { pack } = table(produce(null));
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
