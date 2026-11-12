import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './minister_war';

const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

describe('agenda:minister_war Minister of War', () => {
  // "then they may perform 1 additional action"
  // Checks: the agenda is a hint, shown in the round block.
  // Why nothing is validated: the plan has no turns that a second action could break (an entry is one action), and a
  // law discarded by `spends` carries no choice of the system whose command token goes back; so it is a reminder of
  // the round's flow.
  test('agenda:minister_war is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "then they may perform 1 additional action");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 8.20: "If an 'Elect' or 'For' outcome of a law was resolved, that card remains in play and permanently
  //  affects the game."
  // Checks: the agenda gained is a law in play, and it lifts no check: a route through a nebula stays blocked.
  // Why the check is NOT redundant here: the law speaks of nothing the route counts.
  test('agenda:minister_war gained is a law in play and lifts nothing', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: [{ ...adjust({}, 'strategy'), gains: [id] }, move], game: { map: NEBULA_MAP } });
    expect(endOf(table).laws).toContain(id);
    expectStanding(warningsOf(table, move), 'routeBlocked');
  });

  test.todo('agenda:minister_war the command token removed from the board and returned to the reinforcements: a discarded law has no choice of system in the plan');
});
