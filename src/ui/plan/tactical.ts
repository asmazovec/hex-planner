/**
 * The flight of a tactical action as it is drawn: its formations along the arrows and their timing. The rules of the
 * entry itself live in src/domain/tactical.ts; the names others still take from here are passed on.
 */
import { hexLayout } from '../../domain/hexLayout';
import { sourceSlot, systemsAdjacent } from '../../domain/project';
import { groupOf, poolOf, sourcesOf, viaOf, type TacticalEntry } from '../../domain/tactical';
import { flightDuration, joinShare, type CurveSegment, type RouteShape } from '../map/geometry';
import type { DataPack, Game, GameState, UnitId } from '../../domain/types';

export {
  arrowsOf, entrySystems, flies, groupOf, lossesOf, sourcesOf, stateInFlight, viaOf, withLoss, withRoute, withoutEmptySources, withoutSource,
  type Move, type RouteArrow, type TacticalEntry,
} from '../../domain/tactical';

/** A cell of a route's formation. `joins` say when its units come on board, as a share of the route's length; 0 is the start. */
export interface FlightStack {
  kind: UnitId;
  x: number;
  y: number;
  size: number;
  joins: { at: number; count: number; move: number }[];
}
export interface FlightRoute { segments: CurveSegment[]; durationMs: number; delayMs: number; stacks: FlightStack[] }

const STAGGER_MS = 60;

/** What flies when an action is played: only what really exists, as a rigid formation per route, laid out as on a tile with no planets. */
export function flightRoutes(game: Game, pack: DataPack, entry: TacticalEntry, before: GameState, shapeOf: (from: string) => RouteShape | undefined): FlightRoute[] {
  const left = structuredClone({ systems: before.systems, ground: before.ground });
  const routes: FlightRoute[] = [];
  for (const from of sourcesOf(game, pack, entry)) {
    const shape = shapeOf(from);
    if (!shape || entry.systemId === null) continue;
    const slots = [from, ...viaOf(entry, from), entry.systemId];
    const { segments } = shape;
    const joins = new Map<UnitId, FlightStack['joins']>();
    entry.moves.forEach((move, index) => {
      if (!groupOf(game, pack, [move], from).length) return;
      const pool = poolOf(left, pack, move.from) ?? {};
      const stop = move.pickupOf === undefined ? 0 : slots.indexOf(sourceSlot(game, pack, move.from) ?? '');
      for (const unit of Object.keys(move.units) as UnitId[]) {
        const count = Math.min(move.units[unit] ?? 0, pool[unit] ?? 0);
        if (count <= 0) continue;
        pool[unit] = (pool[unit] ?? 0) - count;
        joins.set(unit, [...(joins.get(unit) ?? []), { at: stop > 0 ? joinShare(segments, stop) : 0, count, move: index }]);
      }
    });
    if (joins.size === 0) continue;
    const space = [...joins].map(([kind, list]) => ({ kind, owner: 'me', count: list.reduce((sum, j) => sum + j.count, 0) }));
    const { items } = hexLayout({ planets: 0, ground: [], space });
    routes.push({
      segments,
      durationMs: flightDuration(slots, systemsAdjacent(game)),
      delayMs: routes.length * STAGGER_MS,
      stacks: items.map(item => ({ kind: item.kind as UnitId, x: item.x, y: item.y, size: item.size, joins: joins.get(item.kind as UnitId) ?? [] })),
    });
  }
  return routes;
}
