import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { fractureSlots, validThundersEdgeSystem } from './thundersEdge';
import { seatSlots } from './mapBuilder';
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

describe('fractureSlots', () => {
  const pack = loadPack(['pok', 'te']);
  const at = (slots: { tileId: string; q: number; r: number }[]) => slots.map(s => [s.tileId, s.q, s.r]);

  test('seat 1 on six players: the chevron at the top corner of ring 4', () => {
    expect(at(fractureSlots(1, 6, pack, 'standard'))).toEqual([
      ['fracture1', -3, -1], ['fracture2', -2, -2], ['fracture3', -1, -3], ['fracture4', 0, -4],
      ['fracture5', 1, -4], ['fracture6', 2, -4], ['fracture7', 3, -4],
    ]);
  });

  test('seat 3 on six players: the chevron turned two steps clockwise, apex at (4, 0)', () => {
    expect(at(fractureSlots(3, 6, pack, 'standard'))).toEqual([
      ['fracture1', 4, -3], ['fracture2', 4, -2], ['fracture3', 4, -1], ['fracture4', 4, 0],
      ['fracture5', 3, 1], ['fracture6', 2, 2], ['fracture7', 1, 3],
    ]);
  });

  test('without a seat the chevron is at the top corner', () => {
    expect(fractureSlots(null, 6, pack, 'standard')).toEqual(fractureSlots(1, 6, pack, 'standard'));
  });

  const templates = pack.templates.filter(t => t.playerCount >= 3 && t.playerCount <= 8);
  test('there are templates to check', () => expect(templates.length).toBeGreaterThanOrEqual(6));

  test.each(templates.map(t => [t.playerCount, t.layout, t] as const))('%i players, %s: seven distinct slots clear of the map for every seat', (count, layout, template) => {
    const taken = new Set(template.slots.map(s => `${s.q},${s.r}`));
    const seats = [null, ...seatSlots(count, pack, layout).map((_, i) => i + 1)];
    for (const seat of seats) {
      const slots = fractureSlots(seat, count, pack, layout);
      expect(slots.map(s => s.tileId)).toEqual([1, 2, 3, 4, 5, 6, 7].map(n => `fracture${n}`));
      expect(new Set(slots.map(s => `${s.q},${s.r}`)).size).toBe(7);
      for (const s of slots) expect(taken.has(`${s.q},${s.r}`)).toBe(false);
    }
  });
});
