import { describe, expect, test } from 'vitest';
import { routeSteps } from '../../../movement';
import { bench, effect, FARTHER, HOME, quote } from '../kit';
import { id } from './travel_ban';

describe('agenda:travel_ban Enforced Travel Ban', () => {
  // "For: Alpha and beta wormholes have no effect during movement."
  // Checks: the law is a reminder in the block of the route, with no waiver.
  // Why the check is NOT redundant here: there is nothing to lift; the law takes adjacency away. The replay counts a
  // step between two systems that are not joined as a jump of one step and warns of nothing (a jump may be the
  // Fracture, a portal or an ability), so a route through a wormhole is counted the same with the law as without.
  test('agenda:travel_ban is a reminder in the block of the route', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'Alpha and beta wormholes have no effect during movement.');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['movement'] });
    expect(effect(table.pack, id).waive).toBeUndefined();
  });

  // LRR Wormholes: systems that contain matching wormholes are adjacent.
  // Checks: why the law changes no count: a route from one wormhole to the other is one step whether the wormholes
  // join the systems or the step is a jump.
  test('agenda:travel_ban a step through a wormhole and a jump cost the same one step', () => {
    const wormholes = bench({ faction: 'sol', game: { map: { [HOME]: 'r-alpha', '1,0': 'r-empty', '2,0': 'r-empty', '3,0': 'r-empty', [FARTHER]: 'r-alpha' } } });
    const plain = bench({ faction: 'sol' });
    expect(routeSteps(wormholes.game, [HOME, FARTHER], wormholes.pack)).toBe(1);
    expect(routeSteps(plain.game, [HOME, FARTHER], plain.pack)).toBe(1);
  });

  test.todo('agenda:travel_ban in play, the highlight of where ships reach leaves out systems joined only by an alpha or beta wormhole: routeReach knows no laws (Creuss is unaffected, note 1)');
  test.todo('agenda:travel_ban "Against" destroys each PDS in or next to a system with a wormhole: a one-off outcome an entry cannot name');
});
