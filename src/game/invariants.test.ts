/** Any sequence of events, sensible or not, leaves a board that holds together. A seeded generator stands in for a property library. */
import { describe, expect, test } from 'vitest';
import { applyAll } from './apply';
import type { GameEvent, Place } from './events';
import { bareBoard, bareTable } from './testTable';
import type { Board } from './types';

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const PLAYERS = bareTable().players.map(p => p.id);
const UNITS = ['carrier', 'cruiser', 'infantry', 'mech'] as const;

function eventOf(r: () => number): GameEvent {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(r() * list.length)];
  const player = pick(PLAYERS);
  const at = (): Place => (r() < 0.5 ? { slot: pick(['0,0', '1,0', '0,1']) } : { planet: pick(['a', 'b', 'c']) });
  const units = { [pick(UNITS)]: 1 + Math.floor(r() * 3) };
  const structures = { [pick(['pds', 'spacedock'] as const)]: 1 + Math.floor(r() * 2) };
  const delta = Math.floor(r() * 9) - 5;
  const kinds: (() => GameEvent)[] = [
    () => ({ type: 'UnitsPlaced', player, at: at(), units }),
    () => ({ type: 'UnitsRemoved', player, at: at(), units }),
    () => ({ type: 'UnitsMoved', player, from: at(), to: at(), units }),
    () => ({ type: 'StructurePlaced', player, at: at(), structures }),
    () => ({ type: 'StructureRemoved', player, at: at(), structures }),
    () => ({ type: 'StructureMoved', player, from: at(), to: at(), structures }),
    () => ({ type: 'PlanetGained', player, planet: pick(['a', 'b', 'c']) }),
    () => ({ type: 'PlanetLost', planet: pick(['a', 'b', 'c']) }),
    () => ({ type: 'SystemActivated', player, system: pick(['0,0', '1,0']) }),
    () => ({ type: 'TokenReturned', player }),
    () => ({ type: 'TokensChanged', player, delta: { tactic: delta, fleet: -delta } }),
    () => ({ type: 'TradeGoodsChanged', player, delta }),
    () => ({ type: 'CommoditiesChanged', player, delta }),
    () => ({ type: 'PointsChanged', player, delta }),
    () => ({ type: 'GoodsTransferred', from: player, to: pick(PLAYERS), tradeGoods: Math.abs(delta), commodities: 1 }),
    () => ({ type: 'CardGained', player, card: pick(['x', 'y']), count: 1 + Math.floor(r() * 2) }),
    () => ({ type: 'CardLost', player, card: pick(['x', 'y']) }),
  ];
  return pick(kinds)();
}

const isCounts = (counts: object): boolean => Object.values(counts).every(n => Number.isInteger(n) && n > 0);

function check(board: Board): void {
  for (const player of Object.values(board.players)) {
    expect(Math.min(player.tradeGoods, player.commodities, player.vp, ...Object.values(player.pools))).toBeGreaterThanOrEqual(0);
    for (const hold of Object.values(player.cards)) expect(hold.count).toBeGreaterThan(0);
  }
  for (const system of Object.values(board.systems)) {
    for (const units of [...Object.values(system.ships), ...Object.values(system.afloat)]) expect(isCounts(units)).toBe(true);
    expect(new Set(system.tokens).size).toBe(system.tokens.length);
    expect(system.tokens.every(id => id in board.players)).toBe(true);
  }
  for (const planet of Object.values(board.planets)) {
    for (const units of Object.values(planet.ground)) expect(isCounts(units)).toBe(true);
    expect(isCounts(planet.structures)).toBe(true);
    // A structure has no owner of its own: it stands only on a planet someone holds, and is that player's.
    if (Object.keys(planet.structures).length > 0) expect(planet.owner).toBeDefined();
    if (planet.owner !== undefined) expect(planet.owner in board.players).toBe(true);
  }
}

describe('any sequence of events keeps the board whole', () => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i', seed => {
    const r = random(seed);
    let board = bareBoard();
    for (let i = 0; i < 300; i += 1) {
      board = applyAll(board, [eventOf(r)]);
      check(board);
    }
    expect(JSON.parse(JSON.stringify(board))).toEqual(board);
  });
});
