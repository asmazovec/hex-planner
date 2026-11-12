import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './minister_peace';

const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

describe('agenda:minister_peace Minister of Peace', () => {
  // "immediately end the active player's turn"
  // Checks: the agenda is a hint, shown in the activation block.
  // Why nothing is validated: it ends another player's turn at its owner's choice; the plan does not model a turn of
  // another player cut short, so it is a reminder in the activation block.
  test('agenda:minister_peace is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "immediately end the active player's turn");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // LRR 8.20: "If an 'Elect' or 'For' outcome of a law was resolved, that card remains in play and permanently
  //  affects the game."
  // Checks: the agenda gained is a law in play, and it lifts no check: a route through a nebula stays blocked.
  // Why the check is NOT redundant here: the law speaks of nothing the route counts.
  test('agenda:minister_peace gained is a law in play and lifts nothing', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: [{ ...adjust({}, 'strategy'), gains: [id] }, move], game: { map: NEBULA_MAP } });
    expect(endOf(table).laws).toContain(id);
    expectStanding(warningsOf(table, move), 'routeBlocked');
  });
});
