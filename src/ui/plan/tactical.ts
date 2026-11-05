import { sourceSlot, suggestUnits, systemPlanets, tileIdOf } from '../../domain/project';
import type { DataPack, Entry, Game, GameState, UnitCounts, UnitId, Warning } from '../../domain/types';
import type { Arrow } from '../map/HexMap';

export type TacticalEntry = Extract<Entry, { type: 'tactical' }>;
export type Move = TacticalEntry['moves'][number];

/** Printed tile number of a slot, which is what the player sees on the table. */
export function systemName(game: Game, pack: DataPack, slot: string): string {
  const tileId = tileIdOf(game, slot);
  return pack.tiles[tileId]?.number ?? tileId;
}

export const hasUnits = (units: UnitCounts | undefined): boolean =>
  Object.values(units ?? {}).some(n => (n ?? 0) > 0);

/** Sets one unit count, dropping the unit at zero. */
export function withCount(units: UnitCounts, unit: UnitId, count: number): UnitCounts {
  const next = { ...units };
  if (count > 0) next[unit] = count;
  else delete next[unit];
  return next;
}

export function addUnits(target: UnitCounts, units: UnitCounts): UnitCounts {
  const sum = { ...target };
  for (const id of Object.keys(units) as UnitId[]) sum[id] = (sum[id] ?? 0) + (units[id] ?? 0);
  return sum;
}

/** Where a source's units can come from: its space area, then its planets that hold ground units. */
export function sourcePools(
  game: Game, pack: DataPack, before: GameState, source: string,
): { from: string; name: string | null; available: UnitCounts }[] {
  const planets = systemPlanets(game, source, pack).filter(p => hasUnits(before.ground[p.id]));
  return [
    { from: source, name: null, available: before.systems[source] ?? {} },
    ...planets.map(p => ({ from: p.id, name: p.name, available: before.ground[p.id] })),
  ];
}

/** The suggested moves from a source: cargo comes from its space area first, then from its planets. */
export function suggestMoves(game: Game, pack: DataPack, before: GameState, source: string): Move[] {
  const pools = sourcePools(game, pack, before, source);
  const remaining = suggestUnits(pools.reduce((sum, p) => addUnits(sum, p.available), {} as UnitCounts), pack);
  const moves: Move[] = [];
  for (const pool of pools) {
    let units: UnitCounts = {};
    for (const id of Object.keys(remaining) as UnitId[]) {
      const count = Math.min(remaining[id] ?? 0, pool.available[id] ?? 0);
      units = withCount(units, id, count);
      remaining[id] = (remaining[id] ?? 0) - count;
    }
    if (hasUnits(units)) moves.push({ from: pool.from, units });
  }
  return moves;
}

/** One arrow per source system, flagged when the projection warned about one of its moves. */
export function arrowsOf(game: Game, pack: DataPack, entry: TacticalEntry, warnings: Warning[]): Arrow[] {
  if (entry.systemId === null) return [];
  const to = entry.systemId;
  const flagged = (move: Move, from: string) => warnings.some(w =>
    (w.code === 'capacityGroup' && w.params.from === from) || (w.code === 'unitsMissing' && w.params.where === move.from));
  const arrows = new Map<string, Arrow>();
  for (const move of entry.moves) {
    const from = sourceSlot(game, pack, move.from);
    if (from === null) continue;
    arrows.set(from, { from, to, warn: flagged(move, from) || arrows.get(from)?.warn });
  }
  return [...arrows.values()];
}
