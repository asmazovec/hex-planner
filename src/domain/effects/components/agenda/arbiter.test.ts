import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './arbiter';

const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

describe('agenda:arbiter Imperial Arbiter', () => {
  // "may discard this card to swap 1 of their strategy cards with 1 of another player's strategy cards"
  // Checks: the agenda is a hint, shown with no step: the agenda phase has none.
  // Why nothing is validated: the swap is made at the end of the strategy phase, before any entry of the round is
  // replayed; the plan takes the card the player ends with as the card of the round (`strategyCard`), so the swap
  // leaves nothing to count or to check. The strategy phase has no step of its own.
  test('agenda:arbiter is a hint: nothing is counted or validated', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "may discard this card to swap 1 of their strategy cards with 1 of another player's strategy cards");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // LRR 8.20: "If an 'Elect' or 'For' outcome of a law was resolved, that card remains in play and permanently
  //  affects the game."
  // Checks: the agenda gained is a law in play, and it lifts no check: a route through a nebula stays blocked.
  // Why the check is NOT redundant here: the law speaks of nothing the route counts.
  test('agenda:arbiter gained is a law in play and lifts nothing', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: [{ ...adjust({}, 'strategy'), gains: [id] }, move], game: { map: NEBULA_MAP } });
    expect(endOf(table).laws).toContain(id);
    expectStanding(warningsOf(table, move), 'routeBlocked');
  });
});
