/** LRR 6 Adjacency. Source: tirules2 rules-reference/adjacency.md. Speeds from the base pack: a destroyer I moves 2. */
import { describe, expect, test } from 'vitest';
import { routeReach, routeSteps } from '../../project';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack(p => {
  // A hyperlane whose only line runs top to bottom: it joins neither of the row's neighbours.
  p.tiles['r-lane-across'] = { id: 'r-lane-across', number: 'r-lane-across', planetIds: [], kind: 'hyperlane', wormholes: [], lanes: [[0, 3]] };
});
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

describe('LRR 6 Adjacency', () => {
  test('6.1 / 101: systems with matching wormholes are adjacent', () => {
    const game = rulesGame({ map: row({ [HOME]: 'r-alpha', [FARTHER]: 'r-alpha' }) });
    expect(routeSteps(game, [HOME, FARTHER], pack)).toBe(1);
  });

  test('6.2: a unit is adjacent to the systems whose tiles touch its own, and to no others', () => {
    const game = rulesGame();
    expect([...routeReach(game, [NEAR], 1, FARTHER, pack)].sort()).toEqual([HOME, TARGET].sort());
  });

  test('6.2.1: a system is not adjacent to itself', () => {
    const game = rulesGame();
    expect(routeReach(game, [HOME], 2, FARTHER, pack).has(HOME)).toBe(false);
  });

  test.todo('6.3: a planet is adjacent to the system holding it — not modelled: nothing in the app asks for a planet\'s adjacency');

  test('6.4: systems joined by a line across hyperlanes are adjacent, and a hyperlane whose lines miss them joins nothing', () => {
    const joined = rulesGame({ map: row({ [NEAR]: 'r-lane' }) });
    expect(routeReach(joined, [HOME], 1, FARTHER, pack).has(TARGET)).toBe(true);
    const missed = rulesGame({ map: row({ [NEAR]: 'r-lane-across' }) });
    expect(routeReach(missed, [HOME], 3, FARTHER, pack).has(TARGET)).toBe(false);
  });

  test('6 note 1: a unit is not adjacent to the system it is in', () => {
    const game = rulesGame();
    expect(routeReach(game, [NEAR], 1, FARTHER, pack).has(NEAR)).toBe(false);
  });

  test('6 note 2: the Creuss home system is adjacent only by its wormhole: ships leaving it reach the gate in one step and nothing else', () => {
    // The Creuss home lies off the map; its gate (tile 17, delta wormhole) stands at NEAR. The projection keeps the home units under the tile id.
    const map = row({ [NEAR]: '17' });
    const toGate = tactical(NEAR, { moves: [{ from: '51', units: { destroyer: 1 } }] });
    const gate = rulesGame({ map, entries: [toGate], game: { faction: 'ghost' } });
    expect(codesOf(gate, pack, toGate)).not.toContain('speedShort');
    // FARTHER has no delta wormhole: from the home it is the gate and three more systems away, beyond a destroyer's two.
    const away = tactical(FARTHER, { moves: [{ from: '51', units: { destroyer: 1 } }] });
    const far = rulesGame({ map, entries: [away], game: { faction: 'ghost' } });
    expect(codesOf(far, pack, away)).toContain('speedShort');
    expect([...routeReach(far, ['51'], 1, FARTHER, pack)]).toEqual([NEAR]);
  });
});
