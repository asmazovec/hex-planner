import type { UnitId } from './types';

/**
 * Where planets and unit tokens stand on a tile, as approved in docs/superpowers/unit-hex-approved.html. The search runs
 * in the prototype's units, where the hex radius is 53, and the result is scaled to the tile's own units.
 */

export type TokenKind = UnitId | 'pds' | 'spacedock';
/** `me` or an opponent id. */
export type StackOwner = string;

export interface SpaceStack { kind: TokenKind; owner: StackOwner; count: number }
export interface GroundStack extends SpaceStack { /** Index of the planet; wraps around the planets of the tile. */ planet: number }

/** Something drawn on the tile that tokens keep clear of, in the tile's own units. */
export interface LayoutObstacle { x: number; y: number; r: number }

export interface HexLayoutInput {
  planets: number;
  ground: GroundStack[];
  space: SpaceStack[];
  /** Rival ids in seat order. Any other owner follows them in order of appearance. */
  opponents?: string[];
  /** Markers drawn on this tile: the command token, the ingress, the seat badge. */
  obstacles?: LayoutObstacle[];
}

export interface PlacedPlanet { x: number; y: number; r: number }
export interface PlacedStack extends SpaceStack {
  key: string;
  /** Set when the stack stands on the arc of a planet. */
  planet?: number;
  x: number;
  y: number;
  size: number;
}
export interface HexLayout { size: number; planets: PlacedPlanet[]; items: PlacedStack[] }

/** Radius of the drawn hex in the tile's units: the map's hex size less a small gap between tiles. */
export const HEX_INNER = 58.5;

const PROTOTYPE_RADIUS = 53;
export const HEX_SCALE = HEX_INNER / PROTOTYPE_RADIUS;

interface Circle { x: number; y: number; r: number }
interface Point { x: number; y: number }

const PLANETS: Circle[][] = [
  [],
  [{ x: 0, y: 1, r: 13 }],
  [{ x: -20, y: -12, r: 11 }, { x: 20, y: 15, r: 11 }],
  [{ x: 0, y: -22, r: 10.5 }, { x: -21, y: 14.4, r: 10.5 }, { x: 21, y: 14.4, r: 10.5 }],
  // The Thunder's Edge planet joins a system of three under the triangle.
  [{ x: 0, y: -22, r: 10.5 }, { x: -21, y: 14.4, r: 10.5 }, { x: 21, y: 14.4, r: 10.5 }, { x: 0, y: 27, r: 9 }],
];
const RING_RADIUS = 28;
const RING_PLANET = 9;

/** No tile has more planets than the table knows, but a ring still gives each one a place. */
function ringOfPlanets(count: number): Circle[] {
  const r = Math.min(RING_PLANET, RING_RADIUS * Math.sin(Math.PI / count) * 0.9);
  return Array.from({ length: count }, (_, i) => {
    const a = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: RING_RADIUS * Math.cos(a), y: RING_RADIUS * Math.sin(a), r };
  });
}

/** The tile number in the top-left corner. */
const NUMBER_SPOT: Circle = { x: -25, y: -39, r: 4 };

/** Units from the heaviest ship down to the ground forces: the order of stacks on a tile, of the shop and of every list of units. */
export const UNIT_ORDER: UnitId[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry', 'mech'];
const ORDER: TokenKind[] = [...UNIT_ORDER, 'pds', 'spacedock'];
const rank = (stack: { kind: TokenKind }) => ORDER.indexOf(stack.kind);

/** Heavy ships are larger, small ones smaller. */
const CLASS_SCALE: Partial<Record<TokenKind, number>> = {
  flagship: 1.12, warsun: 1.12, dreadnought: 1.06, carrier: 1, cruiser: 0.94, destroyer: 0.88, fighter: 0.8,
};

const LARGEST = 22;
/** The prototype stops at 6; below that only an overfull tile goes, which must still show everything. */
const SMALLEST = 1;
const STEP = 0.5;
const GROUND_LARGEST = 17;
/** How much smaller an even group around one planet may get to stand mirror symmetric. */
const BALANCE_SEARCH = 2;
const groundSize = (size: number) => Math.min(size * 0.92, GROUND_LARGEST);

const SIDES: [number, number][] = [[0, -1], [0, 1], [-0.866, -0.5], [0.866, -0.5], [-0.866, 0.5], [0.866, 0.5]];
const COMB_CENTRE_Y = 1;
/** Distance between neighbouring cells of the comb, in token sizes. */
const COMB_SPACING = 1.4;
/** Arc centres to try, in degrees: straight down first. */
const ARC_CENTRES = [90, 135, 45, 180, 0, 225, 315, 270];

const inside = (x: number, y: number, margin: number) =>
  Math.abs(y) <= 46 - margin && Math.abs(x) + Math.abs(y) * 0.5774 <= PROTOTYPE_RADIUS - margin * 1.155;

const hexDistance = (x: number, y: number) => {
  const a = Math.abs(y);
  return Math.max(a / 46, (Math.abs(x) + a * 0.5774) / PROTOTYPE_RADIUS) * 46;
};

/** In a crowded system the planets shrink too, down to 62%. */
function planetsAt(count: number, size: number): Circle[] {
  const k = Math.max(0.62, Math.min(1, 0.62 + (0.38 * (size - 10)) / 10));
  return (PLANETS[count] ?? ringOfPlanets(count)).map(p => ({ x: p.x, y: p.y, r: p.r * k }));
}

/** The opponents among the stacks, in the order they stand on a tile. */
const opponentOrder = (input: HexLayoutInput, stacks: SpaceStack[]): StackOwner[] =>
  [...new Set([...(input.opponents ?? []), ...stacks.map(s => s.owner)])].filter(owner => owner !== 'me');

/** The stacks of each planet on an arc around it, own from one end, then each opponent. Null when they do not fit. */
function placeGround(stacks: GroundStack[], opponents: StackOwner[], planets: Circle[], size: number, obstacles: Circle[]): { stack: GroundStack; x: number; y: number }[] | null {
  const r = size * 0.54;
  const out: { stack: GroundStack; x: number; y: number }[] = [];
  for (let i = 0; i < planets.length; i += 1) {
    const planet = planets[i];
    const own = stacks.filter(s => s.planet === i && s.owner === 'me').sort((a, b) => rank(a) - rank(b));
    const others = opponents.flatMap(owner => stacks.filter(s => s.planet === i && s.owner === owner).sort((a, b) => rank(b) - rank(a)));
    const arc = [...own, ...others];
    if (arc.length === 0) continue;
    const radius = planet.r + r + 1;
    const step = (2 * r * 1.05) / radius;
    if (arc.length * step > Math.PI * 2) return null;
    let found: Point[] | null = null;
    for (const centre of ARC_CENTRES) {
      const start = (centre * Math.PI) / 180;
      const spots: Point[] = [];
      for (let j = 0; j < arc.length; j += 1) {
        const a = start + ((arc.length - 1) / 2 - j) * step;
        const x = planet.x + radius * Math.cos(a);
        const y = planet.y + radius * Math.sin(a);
        if (!inside(x, y, r * 0.3)) break;
        if (obstacles.some(o => o !== planet && Math.hypot(o.x - x, o.y - y) < o.r + r + 0.3)) break;
        spots.push({ x, y });
      }
      if (spots.length === arc.length) { found = spots; break; }
    }
    if (!found) return null;
    found.forEach((spot, j) => {
      out.push({ stack: arc[j], x: spot.x, y: spot.y });
      obstacles.push({ x: spot.x, y: spot.y, r });
    });
  }
  return out;
}

const mirrored = (a: Point, b: Point) => Math.abs(a.x + b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
const lopsided = (pick: Point[]) => pick.filter(p => !pick.some(q => mirrored(p, q))).length;

/**
 * The nearest cells that come in mirrored pairs, for an even count: the plain nearest cells can leave one stack without a
 * partner. Cells on the axis pair up with each other. Null when the cells do not allow it.
 */
function mirroredPick<T extends Point>(cells: T[], count: number): T[] | null {
  const pick: T[] = [];
  let waiting: T | null = null;
  for (const cell of cells) {
    if (pick.length >= count) break;
    if (pick.includes(cell)) continue;
    if (Math.abs(cell.x) < 0.25) {
      if (waiting) { pick.push(waiting, cell); waiting = null; } else waiting = cell;
      continue;
    }
    const partner = cells.find(c => mirrored(c, cell));
    if (partner) pick.push(cell, partner);
  }
  return pick.length === count ? pick : null;
}

/** Honeycomb cells for ships, chosen by the shape of the hex so that all six sides stick out equally. */
function comb(count: number, size: number, obstacles: Circle[], insistOnMirror: boolean): Point[] | null {
  if (count === 0) return [];
  const d = size * COMB_SPACING;
  const h = d * 0.866;
  const margin = size * 0.3;
  const rowOffsets: number[] = [];
  for (let phase = 0; phase < 8; phase += 1) rowOffsets.push(COMB_CENTRE_Y + (phase * h) / 8);
  for (const o of obstacles) if (o.r > 7) rowOffsets.push(o.y);
  // Enough rows and columns to cover the hex at this size.
  const reachCells = Math.max(7, Math.ceil(60 / h));
  let best: { score: number; pick: Point[] } | null = null;
  for (const xOffset of [0, d / 2]) {
    for (const yOffset of rowOffsets) {
      const cells: (Point & { dist: number })[] = [];
      for (let j = -reachCells; j <= reachCells; j += 1) {
        const y = yOffset + j * h;
        const shift = j % 2 !== 0 ? d / 2 : 0;
        for (let i = -reachCells; i <= reachCells; i += 1) {
          const x = xOffset + shift + i * d;
          if (!inside(x, y, margin)) continue;
          if (obstacles.some(o => Math.hypot(o.x - x, o.y - y) < o.r + size * 0.5)) continue;
          cells.push({ x, y, dist: hexDistance(x, y - COMB_CENTRE_Y) });
        }
      }
      if (cells.length < count) continue;
      cells.sort((a, b) => Math.round(a.dist * 2) - Math.round(b.dist * 2) || b.y - a.y || Math.abs(a.x) - Math.abs(b.x) || a.x - b.x);
      const nearest = cells.slice(0, count);
      const pick = (insistOnMirror && lopsided(nearest) > 0 ? mirroredPick(cells, count) : null) ?? nearest;
      const reach = SIDES.map(([vx, vy]) => pick.reduce((most, p) => Math.max(most, p.x * vx + p.y * vy), -99));
      const spread = Math.max(...reach) - Math.min(...reach);
      const score = pick.reduce((sum, p) => sum + p.dist, 0) / count + lopsided(pick) * 3 + spread * 0.8;
      if (!best || score < best.score) best = { score, pick };
    }
  }
  return best ? best.pick : null;
}

const byRow = (a: Point, b: Point) => a.y - b.y || a.x - b.x;

/**
 * Hands out cells ordered left to right, one unbroken group per size, so that a planet in the middle never splits a
 * group. A group starts at the leftmost free cell in a piece of the comb large enough for it and grows to its leftmost
 * free neighbour, skipping a cell that would cut the free cells in two. A group breaks only when no free piece holds it.
 */
function groupsOfCells(cells: Point[], sizes: number[], spacing: number): Point[][] {
  const touch = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < spacing * 1.01;
  const pieces = (points: Point[]) => {
    const found: Set<Point>[] = [];
    for (const start of points) {
      if (found.some(piece => piece.has(start))) continue;
      const piece = new Set([start]);
      for (const point of piece) for (const other of points) if (touch(point, other)) piece.add(other);
      found.push(piece);
    }
    return found;
  };
  let free = [...cells];
  return sizes.map(size => {
    const group: Point[] = [];
    while (group.length < size) {
      const parts = pieces(free);
      const near = group.length > 0
        ? free.filter(c => group.some(g => touch(g, c)))
        : free.filter(c => parts.some(piece => piece.has(c) && piece.size >= size));
      const next = near.find(c => pieces(free.filter(o => o !== c)).length <= parts.length) ?? near[0] ?? free[0];
      free = free.filter(c => c !== next);
      group.push(next);
    }
    return group;
  });
}

function attempt(input: HexLayoutInput, ground: GroundStack[], space: SpaceStack[], size: number, insistOnMirror: boolean): HexLayout | null {
  const planets = planetsAt(input.planets, size);
  const onPlanet = groundSize(size);
  const markers = (input.obstacles ?? []).map(o => ({ x: o.x / HEX_SCALE, y: o.y / HEX_SCALE, r: o.r / HEX_SCALE }));
  const obstacles: Circle[] = [NUMBER_SPOT, ...markers, ...planets];
  const opponents = opponentOrder(input, [...ground, ...space]);
  const placedGround = placeGround(ground, opponents, planets, onPlanet, obstacles);
  if (!placedGround) return null;
  const cells = comb(space.length, size, obstacles, insistOnMirror);
  if (!cells) return null;

  // Own stacks fill the cells from the left, each opponent a group of the rest; within a group they go in rows by rank.
  const fromLeft = [...cells].sort((a, b) => a.x - b.x || a.y - b.y);
  const ofOwner = (owner: StackOwner) => space.filter(s => s.owner === owner).sort((a, b) => rank(a) - rank(b));
  const own = ofOwner('me');
  const others = opponents.map(ofOwner);
  const ownCells = fromLeft.slice(0, own.length).sort(byRow);
  const otherCells = groupsOfCells(fromLeft.slice(own.length), others.map(stacks => stacks.length), size * COMB_SPACING);
  const scale = (value: number) => value * HEX_SCALE;
  const placeShip = (stack: SpaceStack, cell: Point): PlacedStack => ({
    ...stack, key: `${stack.owner}|${stack.kind}|-`, x: scale(cell.x), y: scale(cell.y),
    size: scale(CLASS_SCALE[stack.kind] === undefined ? onPlanet : size * CLASS_SCALE[stack.kind]!),
  });
  return {
    size: scale(size),
    planets: planets.map(p => ({ x: scale(p.x), y: scale(p.y), r: scale(p.r) })),
    items: [
      ...placedGround.map(({ stack, x, y }): PlacedStack => ({
        kind: stack.kind, owner: stack.owner, count: stack.count, planet: stack.planet,
        key: `${stack.owner}|${stack.kind}|${stack.planet}`, x: scale(x), y: scale(y), size: scale(onPlanet),
      })),
      ...own.map((stack, i) => placeShip(stack, ownCells[i])),
      ...others.flatMap((stacks, group) => {
        const groupCells = otherCells[group].sort(byRow);
        return stacks.map((stack, i) => placeShip(stack, groupCells[i]));
      }),
    ],
  };
}

/** For a tile too full for arcs and comb: every stack in a plain grid over the hex, own ones on the left. */
function plainGrid(input: HexLayoutInput, ground: GroundStack[], space: SpaceStack[]): HexLayout {
  const owners = ['me', ...opponentOrder(input, [...ground, ...space])];
  const stacks = [...ground, ...space].sort((a, b) => owners.indexOf(a.owner) - owners.indexOf(b.owner));
  const columns = Math.ceil(Math.sqrt(stacks.length));
  const step = 64 / columns;
  return {
    size: step * 0.9 * HEX_SCALE,
    planets: planetsAt(input.planets, SMALLEST).map(p => ({ x: p.x * HEX_SCALE, y: p.y * HEX_SCALE, r: p.r * HEX_SCALE })),
    items: stacks.map((stack, i) => {
      const planet = 'planet' in stack ? stack.planet as number : undefined;
      return {
        kind: stack.kind, owner: stack.owner, count: stack.count, planet,
        key: `${stack.owner}|${stack.kind}|${planet ?? '-'}`,
        x: (Math.floor(i / columns) - (columns - 1) / 2) * step * HEX_SCALE,
        y: ((i % columns) - (columns - 1) / 2) * step * HEX_SCALE,
        size: step * 0.9 * HEX_SCALE,
      };
    }),
  };
}

/**
 * The largest size at which every stack finds a place. An even group of ships alone around a lone planet stands mirror
 * symmetric, unlike in the prototype, where the tile number blocking one top corner left 10 and 14 ships lopsided: it
 * takes mirrored cells, at a slightly smaller size if need be. Everything else is placed exactly as in the prototype.
 */
export function hexLayout(input: HexLayoutInput): HexLayout {
  const ground = input.planets > 0 ? input.ground.map(stack => ({ ...stack, planet: stack.planet % input.planets })) : [];
  // Ground stacks of a system without planets stand among the ships.
  const space = input.planets > 0 ? input.space : [...input.space, ...input.ground.map(({ kind, owner, count }) => ({ kind, owner, count }))];
  const insistOnMirror = input.planets === 1 && ground.length === 0 && space.length % 2 === 0;
  let unbalanced: { layout: HexLayout; size: number } | null = null;
  for (let size = LARGEST; size >= SMALLEST && (!unbalanced || size >= unbalanced.size - BALANCE_SEARCH); size -= STEP) {
    const layout = attempt(input, ground, space, size, insistOnMirror);
    if (!layout) continue;
    if (!insistOnMirror || lopsided(layout.items) === 0) return layout;
    unbalanced ??= { layout, size };
  }
  if (unbalanced) return unbalanced.layout;
  return plainGrid(input, ground, space);
}
