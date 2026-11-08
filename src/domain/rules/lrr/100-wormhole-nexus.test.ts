/** LRR 100 Wormhole Nexus. Source: tirules2 rules-reference/wormhole-nexus.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { routeSteps } from '../../project';
import { FARTHER, HOME, rulesGame, rulesPack } from '../kit';
import { row } from './kit-83-101';

const pok = loadPack(['pok']);
const pack = rulesPack(p => {
  Object.assign(p.tiles, pok.tiles);
  Object.assign(p.planets, pok.planets);
  p.tiles['r-gamma'] = { id: 'r-gamma', number: 'r-gamma', planetIds: [], kind: 'system', wormholes: ['gamma'] };
});

describe('LRR 100 Wormhole Nexus', () => {
  test.todo('100.1: the nexus is in play from the start, inactive side up — not modelled: no map template places it; the player may put it on the map by hand');

  test('100.1.1: the inactive side has a gamma wormhole only; the active side alpha, beta and gamma', () => {
    expect(pok.tiles['82A']?.wormholes).toEqual(['gamma']);
    expect([...(pok.tiles['82B']?.wormholes ?? [])].sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  test('100.1.1: the inactive nexus does not join alpha wormholes, the active one does', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: '82A', [FARTHER]: 'r-alpha' }) }), [HOME, FARTHER], pack)).toBe(4);
    expect(routeSteps(rulesGame({ map: row({ [HOME]: '82B', [FARTHER]: 'r-alpha' }) }), [HOME, FARTHER], pack)).toBe(1);
  });

  test('100.1.2: the nexus counts as part of the board: its gamma wormhole joins another gamma wormhole', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: '82A', [FARTHER]: 'r-gamma' }) }), [HOME, FARTHER], pack)).toBe(1);
  });

  test.todo('100.1.3: the nexus lies on the edge of the board — not modelled: its place is not fixed');
  test.todo('100.2: a unit moved or placed into the nexus, or control of Mallice, flips it active — not modelled: the tile does not flip by itself; the player swaps it on the map');
  test.todo('100.2.1: a ship moving in flips it at the end of the Movement step — not modelled: the tile does not flip by itself');
  test.todo('100 note 1: any unit in the inactive nexus flips it — not modelled: the tile does not flip by itself');
  test.todo('100 note 2: only Deep Space Cannon through gamma fires in that action — not modelled: Space Cannon is not resolved');
  test.todo('100 note 3: the Hil Colish entering does not flip it before other ships move — not modelled: the tile does not flip by itself');
  test.todo('100 note 4: units and tokens pass to the active side — not modelled: the tile does not flip by itself');
  test.todo('100 note 5: a ship in the nexus qualifies for Become the Gatekeeper — not modelled: objectives are not tracked');
});
