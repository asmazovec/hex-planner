/** LRR 41 Gravity Rift. Source: tirules2 rules-reference/gravity-rift.md. Speeds from the base pack: a cruiser I moves 2, a cruiser II 3. */
import { describe, expect, test } from 'vitest';
import { routeReach } from '../../../testing/old/domain/project';
import type { UnitCounts } from '../../types';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET , tech } from '../kit';

const pack = rulesPack(p => {
  p.tiles['r-rift-twice'] = { id: 'r-rift-twice', number: 'r-rift-twice', planetIds: [], kind: 'system', wormholes: [], anomaly: 'rift', secondAnomaly: 'rift' };
});
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

/** A cruiser flies from `from` along `via` into the active system. */
function flight(from: string, active: string, via: string[], map = row(), units: UnitCounts = { cruiser: 1 }, upgrades: ('cruiser')[] = []) {
  const action = tactical(active, { moves: [{ from, units, via }] });
  const game = rulesGame({ map, units: { [from]: units }, entries: [action], game: { start: { me: { technologies: upgrades.map(tech) }, opponents: {} } } });
  return { game, codes: codesOf(game, pack, action) };
}

describe('LRR 41 Gravity Rift', () => {
  test('41.1: moving out of a gravity rift adds 1 to the move value', () => {
    expect(flight(HOME, FAR, [NEAR, TARGET], row({ [HOME]: 'r-rift' })).codes).not.toContain('speedShort');
  });

  test('41.1: moving through a gravity rift adds 1 to the move value', () => {
    expect(flight(HOME, FAR, [NEAR, TARGET], row({ [NEAR]: 'r-rift' })).codes).not.toContain('speedShort');
  });

  test('41.1: the bonus is only 1: a cruiser I out of a rift still cannot fly four systems', () => {
    expect(flight(HOME, FARTHER, [NEAR, TARGET, FAR], row({ [HOME]: 'r-rift' })).codes).toContain('speedShort');
  });

  test('41.1.1: the reach shown for a route counts the +1, so the active system can be farther', () => {
    const game = rulesGame({ map: row({ [HOME]: 'r-rift' }) });
    expect(routeReach(game, [HOME], 2, FAR, pack).has(FAR)).toBe(true);
  });

  test.todo('41.2: each ship leaving or passing a rift rolls a die and is removed on 1-3 — not modelled: no dice are rolled; a removal is recorded by hand');
  test.todo('41.2.1: transported units roll no die — not modelled: no dice are rolled');
  test.todo('41.2.2: units transported by a removed ship are removed with it — not modelled: no dice are rolled');
  test.todo('41.2.3: removed units return to reinforcements — not modelled: no dice are rolled');

  test('41.3: a rift passed twice in one movement gives its +1 twice', () => {
    // A cruiser II (move 3) from the target out through the rift, round home and back through it, then on to the far system: 5 systems.
    const { codes } = flight(TARGET, FAR, [NEAR, HOME, NEAR, TARGET], row({ [NEAR]: 'r-rift' }), { cruiser: 1 }, ['cruiser']);
    expect(codes).not.toContain('speedShort');
  });

  test('41.3 (note 6): each gravity rift moved out of or through adds its own +1', () => {
    // A cruiser I (move 2) through two rifts reaches four systems away.
    expect(flight(HOME, FARTHER, [NEAR, TARGET, FAR], row({ [NEAR]: 'r-rift', [TARGET]: 'r-rift' })).codes).not.toContain('speedShort');
  });

  test('41 note 6: the reach shown for a route counts each rift on the way', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-rift', [TARGET]: 'r-rift' }) });
    expect(routeReach(game, [HOME], 2, FARTHER, pack).has(FARTHER)).toBe(true);
  });

  test('41.4: a system with two gravity rifts is one rift and gives +1 once', () => {
    expect(flight(HOME, FAR, [NEAR, TARGET], row({ [NEAR]: 'r-rift-twice' })).codes).not.toContain('speedShort');
    expect(flight(HOME, FARTHER, [NEAR, TARGET, FAR], row({ [NEAR]: 'r-rift-twice' })).codes).toContain('speedShort');
  });

  test('41 (note 1): moving into a gravity rift as the active system adds nothing', () => {
    expect(flight(HOME, FAR, [NEAR, TARGET], row({ [FAR]: 'r-rift' })).codes).toContain('speedShort');
  });

  test.todo('41 note 2: a ship removed by a rift is not destroyed — not modelled: removals and destructions are not told apart');
  test.todo('41 note 3: all movement is declared before any rift roll — not modelled: no dice are rolled');
  test.todo('41 note 4: a ship removed by a rift does not count toward the destination\'s fleet pool — not modelled: rift removals are not planned (a loss recorded by hand does not count, see 37 note 4)');
  test.todo('41 note 5: retreating out of a rift rolls for each ship, gains nothing from the +1, and places no token if all are lost — not modelled: retreats are not planned');
  test.todo('41 note 7: a unit whose carrier was removed before picking it up stays where it is — not modelled: no dice are rolled');
  test.todo('41 note 8: a system with a Vuil\'raith Dimensional Tear is a gravity rift — not modelled: the tear token is not on the map');
  test.todo('41 note 9: a future change applies anomaly movement limits to all units — not modelled: not in force');
});
