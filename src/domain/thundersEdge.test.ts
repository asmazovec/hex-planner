import { createGame } from './newGame';
import { describe, expect, test, it } from 'vitest';
import { loadPack } from '../data/loadPack';
import { fractureSlots, validThundersEdgeSystem, withFractureMoved } from './thundersEdge';
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

describe('moving the Fracture', () => {
  const data = loadPack(['pok', 'te']);
  const slotOf = (seat: number | null, tileId: string) => {
    const s = fractureSlots(seat, 6, data, 'standard').find(x => x.tileId === tileId)!;
    return `${s.q},${s.r}`;
  };

  it('takes along what the plans and the board say about its systems, and nothing else', () => {
    const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, data);
    const a = slotOf(null, 'fracture1');
    const b = slotOf(null, 'fracture2');
    game.fracture = { ...game.fracture, active: true, ingress: [a, '0,-1'] };
    game.enemyUnits = { [a]: { x: { cruiser: 1 } }, '0,-1': { x: { cruiser: 2 } } };
    const round = game.plans[0].rounds[0];
    round.entries.push(
      { id: 't', phase: 'action', status: 'planned', type: 'tactical', systemId: a, moves: [{ from: b, units: { cruiser: 1 }, via: [a, '0,-1'], pickupOf: b }, { from: 'jord', units: { infantry: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } },
      { id: 'c', phase: 'action', status: 'planned', type: 'secondary', card: 4, effects: { systemId: a, production: { systemId: b, units: { cruiser: 1 } } } },
      { id: 'd', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: { units: { systemId: b, units: { cruiser: 1 } } } },
    );
    const next = { ...game, fracture: { ...game.fracture, seat: 3 } };
    const moved = withFractureMoved(game, next, data);
    const a2 = slotOf(3, 'fracture1');
    const b2 = slotOf(3, 'fracture2');
    expect(a2).not.toBe(a);
    const [t, c, e] = moved.plans[0].rounds[0].entries as unknown as [Record<string, never>, Record<string, never>, Record<string, never>];
    expect(t).toMatchObject({ systemId: a2, moves: [{ from: b2, via: [a2, '0,-1'], pickupOf: b2 }, { from: 'jord' }] });
    expect(c).toMatchObject({ effects: { systemId: a2, production: { systemId: b2 } } });
    expect(e).toMatchObject({ delta: { units: { systemId: b2 } } });
    expect(moved.fracture.ingress).toEqual([a2, '0,-1']);
    expect(Object.keys(moved.enemyUnits).sort()).toEqual(['0,-1', a2].sort());
    expect(withFractureMoved(game, game, data)).toBe(game);
  });
});
