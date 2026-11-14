import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './prophecy';

const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

describe('agenda:prophecy Prophecy of Ixth', () => {
  // "applies +1 to the result of their fighter's combat rolls"
  // Checks: the agenda is a hint, shown in the combat and production block.
  // Why nothing is validated: the +1 is on combat rolls, which the plan does not simulate; the discard after a
  // production of fewer than 2 fighters is a reminder in the production block.
  test('agenda:prophecy is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "applies +1 to the result of their fighter's combat rolls");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'production']);
  });

  // LRR 8.20: "If an 'Elect' or 'For' outcome of a law was resolved, that card remains in play and permanently
  //  affects the game."
  // Checks: the agenda gained is a law in play, and it lifts no check: a route through a nebula stays blocked.
  // Why the check is NOT redundant here: the law speaks of nothing the route counts.
  test('agenda:prophecy gained is a law in play and lifts nothing', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: [{ ...adjust({}, 'strategy'), gains: [id] }, move], game: { map: NEBULA_MAP } });
    expect(endOf(table).laws).toContain(id);
    expectStanding(warningsOf(table, move), 'routeBlocked');
  });

  test.todo('agenda:prophecy the law discarded when its owner uses PRODUCTION and produces fewer than 2 fighters: a law is not taken out of play by an event of the replay, and the owner of an elected law is not known');
});
