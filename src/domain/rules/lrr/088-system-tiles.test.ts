/** LRR 88 System Tiles. Source: tirules2 rules-reference/system-tiles.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { routeReach } from '../../../testing/old/domain/project';
import { FARTHER, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';
import { row } from './kit-83-101';

const pack = rulesPack();
const base = loadPack([]);
const numbers = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

describe('LRR 88 System Tiles', () => {
  test.todo('88.1: tile backs are green, blue or red — not modelled: the back colour is not kept, the tile kind stands in for it');

  test('88.2: each home system of the base game belongs to exactly one faction', () => {
    for (const id of [...numbers(1, 16), '51']) {
      expect(base.tiles[id]?.kind).toBe('home');
      expect(Object.values(base.factions).filter(f => f.homeTile === id)).toHaveLength(1);
    }
  });

  test('88.3: each blue-backed system (19-38) holds at least one planet', () => {
    for (const id of numbers(19, 38)) expect(base.tiles[id]?.planetIds.length).toBeGreaterThan(0);
  });

  test('88.4: the red-backed systems (39-50) hold no planets; among them are the anomalies', () => {
    for (const id of numbers(39, 50)) expect(base.tiles[id]?.planetIds).toEqual([]);
    expect(numbers(39, 50).filter(id => base.tiles[id]?.anomaly)).toEqual(['41', '42', '43', '44', '45']);
  });

  test('88.5: ground forces that land are kept on the planet, not in the system', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [action] }), pack);
    expect(state.ground.t1).toEqual({ infantry: 1 });
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test('88.6: ships are kept in the space area of their system', () => {
    const action = tactical(HOME, { production: { cruiser: 1 } });
    const { state } = forecast(rulesGame({ entries: [action], game: { docks: ['h1'] } }), pack);
    expect(state.systems[HOME]).toEqual({ cruiser: 1 });
    expect(state.ground.h1).toBeUndefined();
  });

  test('88.7: a hyperlane tile is no system: a ship crosses it but cannot stop on it', () => {
    const reach = routeReach(rulesGame({ map: row({ [NEAR]: 'r-lane' }) }), [HOME], 1, FARTHER, pack);
    expect(reach.has(NEAR)).toBe(false);
    expect(reach.has(TARGET)).toBe(true);
  });
});
