/** LRR 9 Anomalies. Source: tirules2 rules-reference/anomalies.md. A cruiser I moves 2. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { routeMove } from '../../project';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack(p => {
  // Like tile 68: a nebula with a planet in it.
  p.tiles['r-nebula-planet'] = { id: 'r-nebula-planet', number: 'r-nebula-planet', planetIds: ['t2'], kind: 'system', wormholes: [], anomaly: 'nebula' };
  // Like tile 117: a gravity rift that is an asteroid field as well.
  p.tiles['r-rift-asteroid'] = { id: 'r-rift-asteroid', number: 'r-rift-asteroid', planetIds: [], kind: 'system', wormholes: [], anomaly: 'rift', secondAnomaly: 'asteroid' };
});
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

function flight(active: string, via: string[], map: Record<string, string>) {
  const action = tactical(active, { moves: [{ from: HOME, units: { cruiser: 1 }, via }] });
  return codesOf(rulesGame({ map, units: { [HOME]: { cruiser: 1 } }, entries: [action] }), pack, action);
}

describe('LRR 9 Anomalies', () => {
  test.todo('9.1: an anomaly has a red border on its corners — not modelled: print; the data marks it instead');

  test('9.2: there are four types of anomaly: asteroid field, nebula, supernova and gravity rift', () => {
    const base = loadPack([]);
    const kinds = new Set(Object.values(base.tiles).flatMap(t => (t.anomaly ? [t.anomaly] : [])));
    expect([...kinds].sort()).toEqual(['asteroid', 'nebula', 'rift', 'supernova']);
  });

  test('9.2.1: an anomaly with planets is still an anomaly: a nebula with a planet cannot be passed through', () => {
    expect(flight(TARGET, [NEAR], row({ [NEAR]: 'r-nebula-planet' }))).toContain('routeBlocked');
  });

  test.todo('9.3: each type is told by its art — not modelled: print');
  test.todo('9.4: abilities can make a system an anomaly as well as what it is — not modelled: no such ability is tracked');

  test('9.5: a system that is two anomalies has the properties of both', () => {
    const map = row({ [NEAR]: 'r-rift-asteroid' });
    expect(flight(NEAR, [], map)).toContain('routeBlocked');
    const game = rulesGame({ map });
    expect(routeMove(game, [NEAR], 2, pack)).toBe(3);
  });

  test('9 note 1: an empty system is no anomaly: ships pass it at their own speed', () => {
    expect(flight(TARGET, [NEAR], row())).toEqual([]);
    expect(routeMove(rulesGame(), [NEAR], 2, pack)).toBe(2);
  });

  test('9 note 2: a system with a wormhole is no anomaly: ships pass it freely', () => {
    expect(flight(TARGET, [NEAR], row({ [NEAR]: 'r-alpha' }))).toEqual([]);
  });

  test.todo('9 note 3: a Vuil\'raith Dimensional Tear makes its system a gravity rift — not modelled: the Dimensional Tear is not tracked');
});
