import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { validThundersEdgeSystem } from './thundersEdge';
import type { TileDef } from './types';

const base: TileDef = { id: 'x', number: '1', planetIds: [], kind: 'system', wormholes: [] };

test("Thunder's Edge cannot go on a planet, a supernova or a printed wormhole", () => {
  expect(validThundersEdgeSystem(base)).toBe(true);
  expect(validThundersEdgeSystem({ ...base, planetIds: ['p'] })).toBe(false);
  expect(validThundersEdgeSystem({ ...base, anomaly: 'supernova' })).toBe(false);
  expect(validThundersEdgeSystem({ ...base, anomaly: 'asteroid', secondAnomaly: 'supernova' })).toBe(false);
  expect(validThundersEdgeSystem({ ...base, wormholes: ['alpha'] })).toBe(false);
});

test('other anomalies are fine, but hyperlanes, home systems and the Fracture are not systems for it', () => {
  expect(validThundersEdgeSystem({ ...base, anomaly: 'nebula' })).toBe(true);
  expect(validThundersEdgeSystem({ ...base, kind: 'hyperlane' })).toBe(false);
  expect(validThundersEdgeSystem({ ...base, kind: 'home' })).toBe(false);
  expect(validThundersEdgeSystem({ ...base, kind: 'fracture' })).toBe(false);
});

test('real tiles: only empty systems without wormholes pass, Mecatol Rex does not', () => {
  const pack = loadPack(['pok', 'te']);
  const valid = Object.values(pack.tiles).filter(validThundersEdgeSystem);
  expect(valid.length).toBeGreaterThan(0);
  expect(valid.every(tile => tile.planetIds.length === 0 && tile.wormholes.length === 0)).toBe(true);
  expect(validThundersEdgeSystem(pack.tiles['18'])).toBe(false);
});
