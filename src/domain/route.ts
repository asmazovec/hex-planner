import type { Entry } from './types';

/** Flat-top hexes on axial coordinates: north is r - 1, north-east is q + 1, r - 1. */
export const HEX_SIZE = 60;

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export function hexToPixel(q: number, r: number, size: number = HEX_SIZE): Point {
  return { x: size * 1.5 * q, y: size * Math.sqrt(3) * (q / 2 + r) };
}

const parseSlot = (slot: string): { q: number; r: number } | null => {
  const [q, r] = slot.split(',').map(Number);
  return r === undefined || Number.isNaN(q) || Number.isNaN(r) ? null : { q, r };
};

/** The centre of a slot; a slot key that is no `q,r`, like an off-map tile's id, stands at the origin. */
export function slotToPixel(slot: string): Point {
  const at = parseSlot(slot);
  return at ? hexToPixel(at.q, at.r) : { x: 0, y: 0 };
}

const NEIGHBOURS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

/** Plain grid neighbours: wormholes and hyperlanes are not interpreted. */
export function areAdjacent(a: string, b: string): boolean {
  const p = parseSlot(a);
  const s = parseSlot(b);
  return p !== null && s !== null && NEIGHBOURS.some(([q, r]) => p.q + q === s.q && p.r + r === s.r);
}

export type Adjacency = (a: string, b: string) => boolean;

/** One step of a drawn route: the previous hex removes the last step, a hex already on it changes nothing, any other is added. */
export function extendPath(path: string[], slot: string): string[] {
  if (path.at(-1) === slot) return path;
  if (path.at(-2) === slot) return path.slice(0, -1);
  return path.includes(slot) ? path : [...path, slot];
}

export interface RouteDraft { from: string; via: string[] }

/** What a finished drag means: the path must join a system and the active one, in either direction. */
export function routeFromPath(path: string[], active: string): RouteDraft | null {
  if (path.length < 2) return null;
  const flight = path[0] === active ? [...path].reverse() : path;
  return flight.at(-1) === active ? { from: flight[0], via: flight.slice(1, -1) } : null;
}

/** One tap in arrow mode. `onActive` is a tap on the active system with no route under way. */
export function tapStep(path: string[] | null, slot: string, active: string): { path: string[] | null; route?: RouteDraft; onActive?: true } {
  if (path === null) return slot === active ? { path: null, onActive: true } : { path: [slot] };
  if (slot === active) return { path: null, route: { from: path[0], via: path.slice(1) } };
  if (path.at(-1) === slot) return { path: path.length > 1 ? path.slice(0, -1) : null };
  return { path: path.includes(slot) ? path : [...path, slot] };
}

/** The gap between neighbouring parallel routes, and the most they may spread: a fifth of the hex width. */
const ROUTE_GAP = 15;
const MAX_SPREAD = (HEX_SIZE * 2) / 5;
/** How far a route stops before the centre of the active system, and how far from the source centre it starts. */
const ARRIVAL_CUT = 30;
const START_LEAD = 18;
const START_LEAD_STRAIGHT = 4;
const END_SHARE = 0.4;
/** Ends of routes at one system stay this far apart, as long as they stay this near its centre. */
const ARRIVAL_GAP = 12;
const ARRIVAL_REACH = HEX_SIZE * 0.8;

interface Span { route: number; segment: number; line: string; from: number; to: number; normal: Point }

/** Each segment on its line: the direction does not depend on the way the route runs, so routes over one line share a side. */
function spanOf(route: number, segment: number, a: Point, b: Point): Span {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const flip = b.x - a.x < -1e-6 || (Math.abs(b.x - a.x) <= 1e-6 && b.y < a.y) ? -1 : 1;
  const dir = { x: (flip * (b.x - a.x)) / length, y: (flip * (b.y - a.y)) / length };
  const normal = { x: -dir.y, y: dir.x };
  const along = (p: Point) => p.x * dir.x + p.y * dir.y;
  const across = a.x * normal.x + a.y * normal.y;
  return {
    route, segment, normal, line: `${dir.x.toFixed(3)},${dir.y.toFixed(3)},${across.toFixed(1)}`,
    from: Math.min(along(a), along(b)), to: Math.max(along(a), along(b)),
  };
}

/** The sideways offset of every segment: those overlapping on one line spread evenly around it, in route order. */
function segmentOffsets(routes: Point[][]): Point[][] {
  const offsets = routes.map(points => points.slice(1).map(() => ({ x: 0, y: 0 })));
  const lines = new Map<string, Span[]>();
  routes.forEach((points, route) => {
    for (let segment = 0; segment + 1 < points.length; segment += 1) {
      const span = spanOf(route, segment, points[segment], points[segment + 1]);
      lines.set(span.line, [...(lines.get(span.line) ?? []), span]);
    }
  });
  for (const spans of lines.values()) {
    const sorted = [...spans].sort((a, b) => a.from - b.from || a.route - b.route);
    let group: Span[] = [];
    let end = -Infinity;
    const close = () => {
      const ordered = [...group].sort((a, b) => a.route - b.route || a.segment - b.segment);
      const gap = ordered.length > 1 ? Math.min(ROUTE_GAP, MAX_SPREAD / (ordered.length - 1)) : 0;
      ordered.forEach((span, i) => {
        const shift = (i - (ordered.length - 1) / 2) * gap;
        offsets[span.route][span.segment] = { x: span.normal.x * shift, y: span.normal.y * shift };
      });
    };
    for (const span of sorted) {
      if (span.from >= end - 1) {
        close();
        group = [];
        end = -Infinity;
      }
      group.push(span);
      end = Math.max(end, span.to);
    }
    close();
  }
  return offsets;
}

const isZero = (p: Point) => p.x === 0 && p.y === 0;

/** A waypoint between two segments follows the one that is offset, or the middle of both. */
function joinOffset(before: Point | undefined, after: Point | undefined): Point {
  if (!before) return after ?? { x: 0, y: 0 };
  if (!after || isZero(after)) return before;
  if (isZero(before)) return after;
  return { x: (before.x + after.x) / 2, y: (before.y + after.y) / 2 };
}

const towards = (from: Point, to: Point, distance: number): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: from.x + ((to.x - from.x) / length) * distance, y: from.y + ((to.y - from.y) / length) * distance };
};

/** Control points of each route, in the given order. `routes` hold slot keys in flight order, the active system last. */
export function separateRoutes(routes: string[][]): Point[][] {
  const centres = routes.map(slots => slots.map(slotToPixel));
  const offsets = segmentOffsets(centres);
  const placed = centres.map((points, r) => {
    const moved = points.map((p, i) => {
      const off = joinOffset(offsets[r][i - 1], offsets[r][i]);
      return { x: p.x + off.x, y: p.y + off.y };
    });
    const last = moved.length - 1;
    moved[last] = towards(moved[last], moved[last - 1], Math.min(ARRIVAL_CUT, Math.hypot(moved[last].x - moved[last - 1].x, moved[last].y - moved[last - 1].y) * END_SHARE));
    const lead = last === 1 ? START_LEAD_STRAIGHT : START_LEAD;
    moved[0] = towards(moved[0], moved[1], Math.min(lead, Math.hypot(moved[1].x - moved[0].x, moved[1].y - moved[0].y) * END_SHARE));
    return moved;
  });
  // Lines that do not overlap may still end close together: the later one moves aside.
  const ends = new Map<string, Point[]>();
  placed.forEach((points, r) => {
    const target = routes[r].at(-1) ?? '';
    const taken = ends.get(target) ?? [];
    const last = points.length - 1;
    const dir = towards({ x: 0, y: 0 }, { x: points[last].x - points[last - 1].x, y: points[last].y - points[last - 1].y }, 1);
    const centre = slotToPixel(target);
    for (let tries = 0; tries < taken.length + 1 && taken.some(p => Math.hypot(p.x - points[last].x, p.y - points[last].y) < ARRIVAL_GAP); tries += 1) {
      const aside = { x: points[last].x - dir.y * ARRIVAL_GAP, y: points[last].y + dir.x * ARRIVAL_GAP };
      // Many routes on one step may crowd rather than point past the system they arrive at.
      if (Math.hypot(aside.x - centre.x, aside.y - centre.y) > ARRIVAL_REACH) break;
      points[last] = aside;
    }
    ends.set(target, [...taken, points[last]]);
  });
  return placed;
}

const CORNER_STEPS = 14;
/** A corner begins no further than half the way between neighbours: on a long leg the line stays straight until the hex it turns in, and does not cut the corner past it. */
const CORNER_REACH = (HEX_SIZE * Math.sqrt(3)) / 2;

/** The line through the control points, and where in it each waypoint comes closest. */
function buildCurve(control: Point[]): { curve: Point[]; waypoints: number[] } {
  if (control.length < 3) return { curve: control, waypoints: [] };
  const curve = [control[0]];
  const waypoints: number[] = [];
  for (let i = 1; i < control.length - 1; i += 1) {
    const corner = control[i];
    const reach = (other: Point) => Math.min(CORNER_REACH, Math.hypot(other.x - corner.x, other.y - corner.y) / 2);
    // The first corner starts where the route does when that is near, the last one ends where it ends: nothing is left straight at the ends of a short route.
    const before = control[i - 1];
    const after = control[i + 1];
    const near = (other: Point) => Math.hypot(other.x - corner.x, other.y - corner.y) <= 2 * CORNER_REACH;
    const start = i === 1 && near(before) ? before : towards(corner, before, reach(before));
    const end = i === control.length - 2 && near(after) ? after : towards(corner, after, reach(after));
    const last = curve[curve.length - 1];
    if (Math.hypot(start.x - last.x, start.y - last.y) > 1e-6) curve.push(start);
    const from = curve.length - 1;
    for (let step = 1; step <= CORNER_STEPS; step += 1) {
      const u = step / CORNER_STEPS;
      const a = (1 - u) * (1 - u);
      const b = 2 * u * (1 - u);
      const c = u * u;
      curve.push({ x: a * start.x + b * corner.x + c * end.x, y: a * start.y + b * corner.y + c * end.y });
    }
    waypoints.push(from + CORNER_STEPS / 2);
  }
  const end = control[control.length - 1];
  const last = curve[curve.length - 1];
  if (Math.hypot(end.x - last.x, end.y - last.y) > 1e-6) curve.push(end);
  return { curve, waypoints };
}

/** The smooth line through the control points: a straight one between two points, curved corners otherwise. */
export const curveThrough = (control: Point[]): Point[] => buildCurve(control).curve;

/** A piece of the curve from one waypoint to the next. `gap` marks a step between hexes that are no neighbours. */
export interface CurveSegment { points: Point[]; gap: boolean }

/** The curve cut at the waypoints, where each corner is closest to its hex. */
export function curveSegments(control: Point[], slots: string[], adjacent: Adjacency = areAdjacent): CurveSegment[] {
  const { curve, waypoints } = buildCurve(control);
  const cuts = [0, ...waypoints, curve.length - 1];
  return cuts.slice(1).map((cut, i) => ({ points: curve.slice(cuts[i], cut + 1), gap: !adjacent(slots[i], slots[i + 1]) }));
}

export function pathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return length;
}

/** The point at a fraction of the length of a line. */
export function pointAlong(points: Point[], fraction: number): Point {
  let left = fraction * pathLength(points);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= length || i === points.length - 1) {
      const share = length > 0 ? left / length : 0;
      return { x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share };
    }
    left -= length;
  }
  return points[0];
}

const HEAD_CLEARANCE = 34;
const BADGE_MIN_SHARE = 0.3;
const BADGE_MAX_SHARE = 0.68;
/** Twice the radius of a badge, so two of them never touch. */
const BADGE_SPACING = 21;
const BADGE_BACKSTEP = 0.12;
const BADGE_LAST_SHARE = 0.1;
const BADGE_TRIES = 6;

/** Where the order badge of each curve stands: near its head, with the line clear before it, not on another badge. */
export function badgeSpots(curves: Point[][]): Point[] {
  const spots: Point[] = [];
  for (const curve of curves) {
    const length = pathLength(curve);
    // The line stays clear before the head: on a short arrow that moves the badge towards the tail.
    let share = Math.max(BADGE_MIN_SHARE, Math.min(BADGE_MAX_SHARE, (length - HEAD_CLEARANCE) / length));
    let spot = pointAlong(curve, share);
    const free = (p: Point) => !spots.some(other => Math.hypot(other.x - p.x, other.y - p.y) < BADGE_SPACING);
    for (let tries = 0; tries < BADGE_TRIES && !free(spot); tries += 1) {
      share -= BADGE_BACKSTEP;
      spot = pointAlong(curve, Math.max(BADGE_LAST_SHARE, share));
    }
    spots.push(spot);
  }
  return spots;
}

/** Everything drawn for one route, and what its flight follows. */
export interface RouteShape { curve: Point[]; segments: CurveSegment[]; badge: Point }

export function routeShapes(routes: string[][], adjacent: Adjacency = areAdjacent): RouteShape[] {
  const controls = separateRoutes(routes);
  const curves = controls.map(curveThrough);
  const badges = badgeSpots(curves);
  return routes.map((slots, i) => ({ curve: curves[i], segments: curveSegments(controls[i], slots, adjacent), badge: badges[i] }));
}

const FLIGHT_HEX_MS = 300;
const FLIGHT_MAX_MS = 1600;
/** How much faster a route goes over a step between hexes that are no neighbours. */
const GAP_SPEED = 3;

/** How long a route flies: about 300 ms per hex, a third of that on a broken step, capped at 1.6 s. */
export function flightDuration(slots: string[], adjacent: Adjacency = areAdjacent): number {
  let time = 0;
  for (let i = 1; i < slots.length; i += 1) time += adjacent(slots[i - 1], slots[i]) ? FLIGHT_HEX_MS : FLIGHT_HEX_MS / GAP_SPEED;
  return Math.min(FLIGHT_MAX_MS, time);
}

/** Where a flight is at a share of its time: constant speed along the line, faster on a broken step. `frac` is the share of the length behind it. */
export function flightAt(segments: CurveSegment[], progress: number): { point: Point; frac: number; gap: boolean } {
  const lengths = segments.map(s => pathLength(s.points));
  const times = lengths.map((length, i) => (segments[i].gap ? length / GAP_SPEED : length));
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = progress * times.reduce((a, b) => a + b, 0);
  let done = 0;
  for (let i = 0; i < segments.length; i += 1) {
    if (left <= times[i] || i === segments.length - 1) {
      const share = times[i] > 0 ? Math.min(1, left / times[i]) : 1;
      return { point: pointAlong(segments[i].points, share), frac: total > 0 ? (done + share * lengths[i]) / total : 1, gap: segments[i].gap };
    }
    left -= times[i];
    done += lengths[i];
  }
  return { point: { x: 0, y: 0 }, frac: 1, gap: false };
}

/** The share of the route's length behind the leader when it passes the waypoint with this index. */
export function joinShare(segments: CurveSegment[], waypoint: number): number {
  const lengths = segments.map(s => pathLength(s.points));
  const total = lengths.reduce((a, b) => a + b, 0);
  return total > 0 ? lengths.slice(0, waypoint).reduce((a, b) => a + b, 0) / total : 0;
}

/** The hex radius and half a hex of margin on each axis, and no closer than about two hexes and a half. */
const FOCUS_MARGIN_X = HEX_SIZE + 55;
const FOCUS_MARGIN_Y = (HEX_SIZE * Math.sqrt(3)) / 2 + 48;
const FOCUS_MIN_WIDTH = 300;
const FOCUS_MIN_HEIGHT = 260;

/** The area the camera shows for these systems, in map units; null without any system. */
export function focusRect(slots: string[]): Rect | null {
  if (slots.length === 0) return null;
  const points = slots.map(slotToPixel);
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + 2 * FOCUS_MARGIN_X, FOCUS_MIN_WIDTH);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + 2 * FOCUS_MARGIN_Y, FOCUS_MIN_HEIGHT);
  return { x: midX - width / 2, y: midY - height / 2, width, height };
}

/** The order number of each tactical action of a round, in entry order. A cancelled one keeps no number. */
export function tacticalNumbers(entries: Entry[]): Record<string, number> {
  const numbers: Record<string, number> = {};
  let next = 1;
  for (const entry of entries) {
    if (entry.type === 'tactical' && entry.status !== 'cancelled') {
      numbers[entry.id] = next;
      next += 1;
    }
  }
  return numbers;
}
