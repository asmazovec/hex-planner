import type { Entry } from './types';

/** Slots are `q,r` keys of flat-top hexes on axial coordinates: north is r - 1, north-east is q + 1, r - 1. */
export const parseSlot = (slot: string): { q: number; r: number } | null => {
  const [q, r] = slot.split(',').map(Number);
  return r === undefined || Number.isNaN(q) || Number.isNaN(r) ? null : { q, r };
};

const NEIGHBOURS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

/** The way across each edge of a hex: edge 0 is at the top and numbers go clockwise, as hyperlane lines count them. */
const ACROSS_EDGE = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]];

export const oppositeEdge = (edge: number): number => (edge + 3) % 6;

/** The slot on the other side of an edge; null for a key that is no `q,r`. */
export function slotAcross(slot: string, edge: number): string | null {
  const at = parseSlot(slot);
  return at && `${at.q + ACROSS_EDGE[edge][0]},${at.r + ACROSS_EDGE[edge][1]}`;
}

/** Hexes between two slots by the grid alone, holes in the map or not; 1 for a key that is no `q,r`. */
export function gridDistance(a: string, b: string): number {
  const p = parseSlot(a);
  const s = parseSlot(b);
  // TODO(P2-011) #ws:movement #type:bug #rule:6-note-2 #test:006-adjacency #dep:P2-010 #size:s #Creuss — Ключ не вида q,r считается в одном шаге от всего: после P2-010 бросать ошибку или возвращать Infinity — P2 note: after P2-010 the off-map home is a node of the route graph, so no real system key reaches this fallback; Infinity breaks about 20 unit and screen tests whose fixtures use letter slot keys ('A', 'B', 'H') one step apart, so the fallback stays until those fixtures move to q,r keys
  if (!p || !s) return 1;
  const q = p.q - s.q;
  const r = p.r - s.r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

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

/** What stays of a stroke lifted short of the end: the active system is where a route ends, never a hex on its way. */
export function pausedPath(path: string[], active: string): string[] {
  const at = path.indexOf(active);
  return at > 0 ? path.slice(0, at) : path;
}

/** One tap in arrow mode. `onActive` is a tap on the active system with no route under way. */
export function tapStep(path: string[] | null, slot: string, active: string): { path: string[] | null; route?: RouteDraft; onActive?: true } {
  if (path === null) return slot === active ? { path: null, onActive: true } : { path: [slot] };
  if (slot === active) return { path: null, route: { from: path[0], via: path.slice(1) } };
  if (path.at(-1) === slot) return { path: path.length > 1 ? path.slice(0, -1) : null };
  return { path: path.includes(slot) ? path : [...path, slot] };
}

/** The order number of each tactical action of a round, in entry order. A cancelled one keeps no number. */
export function tacticalNumbers(entries: Entry[]): Record<string, number> {
  const numbers: Record<string, number> = {};
  const counted = new Map<string | undefined, number>();
  for (const entry of entries) {
    if (entry.type === 'tactical' && entry.status !== 'cancelled') {
      const next = (counted.get(entry.owner) ?? 0) + 1;
      counted.set(entry.owner, next);
      numbers[entry.id] = next;
    }
  }
  return numbers;
}
