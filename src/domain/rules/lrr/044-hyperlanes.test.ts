/** LRR 44 Hyperlanes. Source: tirules2 rules-reference/hyperlanes.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { routeReach, routeSteps } from '../../project';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

/**
 * A hyperlane like tile 87A: two of its lines meet at edge 2. Put at NEAR (1,0), edge 5 faces HOME, edge 2 faces TARGET,
 * edge 0 faces 1,-1 and edge 4 faces 0,1.
 */
const forkPack = rulesPack(p => {
  p.tiles['r-fork'] = { id: 'r-fork', number: 'r-fork', planetIds: [], kind: 'hyperlane', wormholes: [], lanes: [[0, 2], [2, 4]] };
});

describe('LRR 44 Hyperlanes', () => {
  test('44.1: systems joined by a hyperlane line are adjacent', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }) });
    expect(routeSteps(game, [HOME, NEAR, TARGET], pack)).toBe(1);
  });

  test('44.1: a ship of move 1 reaches the system at the far end of a hyperlane line', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }) });
    expect(routeReach(game, [HOME], 1, FARTHER, pack).has(TARGET)).toBe(true);
  });

  test('44.1: a ship of move 1 crosses the hyperlane line with no speed warning', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }), units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('44.1: a hyperlane turned so that no line runs between two systems does not join them', () => {
    // r-lane joins edges 2 and 5; one turn makes it join 3 and 0, across the row.
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane@1' }) });
    expect(routeReach(game, [HOME], 5, FARTHER, pack).has(TARGET)).toBe(false);
  });

  test('44.2: a hyperlane is no system: a ship cannot end its move there', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }) });
    expect(routeReach(game, [HOME], 1, FARTHER, pack).has(NEAR)).toBe(false);
  });

  test('44.2: a hyperlane cannot be the active system: ships sent there are warned about', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }), units: { [HOME]: { cruiser: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('routeBlocked');
  });

  test.todo('44 note 1: a system touching a hyperlane is not on the edge of the board — not modelled: board edges are not used');
  test.todo('44 note 1.1: the centre system of the five and seven player hyperlane rings is not on the edge — not modelled: board edges are not used');
  test.todo('44 note 1.2: in the seven and eight player alternate setups only ring 3 and homes are on the edge — not modelled: board edges are not used');
  test.todo('44 note 2.1: hyperlane adjacency counts for Deep Space Cannon — not modelled: no space cannon');

  test('44 note 2.2: hyperlane adjacency counts for movement', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-lane' }) });
    expect(routeSteps(game, [HOME, TARGET], pack)).toBe(1);
  });

  test.todo('44 note 2.3: hyperlane adjacency counts for neighbors — not modelled: no transactions');
  test.todo('44 note 2.4: hyperlane adjacency counts for any effect about adjacent systems — not modelled: such effects are not tracked');

  test('44 note 3: lines of one hyperlane that meet at an edge do not join the systems at their other ends', () => {
    const game = rulesGame({ map: { ...row({ [NEAR]: 'r-fork' }), '1,-1': 'r-empty', '0,1': 'r-empty' } });
    // Edge 0 and edge 4 both lead to edge 2, but not to each other.
    expect(routeReach(game, ['1,-1'], 1, FARTHER, forkPack).has(TARGET)).toBe(true);
    expect(routeReach(game, ['1,-1'], 1, FARTHER, forkPack).has('0,1')).toBe(false);
  });

  test('44 note 3: the real tile 87A does not join the systems at edges 0 and 4', () => {
    const tile = loadPack(['pok']).tiles['87A'];
    const real = rulesPack(p => {
      p.tiles['87A'] = tile;
    });
    const game = rulesGame({ map: { ...row({ [NEAR]: '87A' }), '1,-1': 'r-empty', '0,1': 'r-empty' } });
    expect(routeReach(game, ['1,-1'], 1, FARTHER, real).has('0,1')).toBe(false);
  });
});
