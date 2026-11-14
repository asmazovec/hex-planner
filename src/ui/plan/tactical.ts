/**
 * The flight of a tactical action as it is drawn: its formations along the arrows and their timing. The rules of the
 * entry itself live in src/domain/tactical.ts; the names others still take from here are passed on.
 */
import { hexLayout } from '../../domain/hexLayout';
import { sourceSlot, systemsAdjacent } from '../../domain/replay';
import { groupOf, sourcesOf, viaOf, tacticalOf, type At } from '../../game/edit/tactical';
import type { Turn } from '../../game/actions';
import { flightDuration, joinShare, slotToPixel, type CurveSegment, type Point, type RouteShape } from '../map/geometry';
import type { UnitId } from '../../domain/types';

export { arrowsOf, entrySystems, flies, groupOf, lossesOf, sourcesOf, viaOf, withLoss, withRoute, withoutEmptySources, withoutSource, type Move, type RouteArrow, type TacticalEntry } from '../../domain/tactical';

const placeId = (place: { planet: string } | { slot: string }): string => ('planet' in place ? place.planet : place.slot);

/**
 * A cell of a route's formation. `joins` say when its units come on board, as a share of the route's length; 0 is the
 * start. `pickup`: they are picked up, from a planet or a system on the way, and leave it as they come on board.
 */
export interface FlightStack {
  kind: UnitId;
  x: number;
  y: number;
  size: number;
  joins: { at: number; count: number; move: number; pickup?: true }[];
}
export interface FlightRoute { segments: CurveSegment[]; durationMs: number; delayMs: number; stacks: FlightStack[] }

const STAGGER_MS = 60;

/** The segments of a route with its last one carried on to `centre`. */
export function withArrival(segments: CurveSegment[], centre: Point): CurveSegment[] {
  const last = segments.at(-1);
  if (!last) return segments;
  const end = last.points.at(-1);
  if (end && Math.hypot(end.x - centre.x, end.y - centre.y) < 0.5) return segments;
  return [...segments.slice(0, -1), { ...last, points: [...last.points, centre] }];
}

/** What flies when an action is played: what was entered, as the replay carries it, a rigid formation per route, laid out as on a tile with no planets. */
export function flightRoutes(at: At, turn: Turn, shapeOf: (from: string) => RouteShape | undefined): FlightRoute[] {
  const routes: FlightRoute[] = [];
  const action = tacticalOf(turn);
  const target = action.system;
  for (const from of sourcesOf(at, action)) {
    const shape = shapeOf(from);
    if (!shape || target === null) continue;
    const slots = [from, ...viaOf(action, from), target];
    // The arrow stops short of the hex for its head; the ships fly on to the middle of the system they arrive in.
    const segments = withArrival(shape.segments, slotToPixel(target));
    const joins = new Map<UnitId, FlightStack['joins']>();
    action.movement.forEach((move, index) => {
      if (!groupOf(at, [move], from).length) return;
      const stop = move.pickupOf === undefined ? 0 : slots.indexOf(sourceSlot(at.map, at.pack, placeId(move.from)) ?? '');
      for (const unit of Object.keys(move.units) as UnitId[]) {
        const count = move.units[unit] ?? 0;
        if (count <= 0) continue;
        joins.set(unit, [...(joins.get(unit) ?? []), { at: stop > 0 ? joinShare(segments, stop) : 0, count, move: index, ...(move.pickupOf === undefined ? {} : { pickup: true as const }) }]);
      }
    });
    if (joins.size === 0) continue;
    const space = [...joins].map(([kind, list]) => ({ kind, owner: 'me', count: list.reduce((sum, j) => sum + j.count, 0) }));
    const { items } = hexLayout({ planets: 0, ground: [], space });
    routes.push({
      segments,
      durationMs: flightDuration(slots, systemsAdjacent(at.map)),
      delayMs: routes.length * STAGGER_MS,
      stacks: items.map(item => ({ kind: item.kind as UnitId, x: item.x, y: item.y, size: item.size, joins: joins.get(item.kind as UnitId) ?? [] })),
    });
  }
  return routes;
}
