import { clockwiseAngle, hexDistance, seatSlots, slotsFor } from './mapBuilder';
import { slotKeyOf } from './layouts';
import type { DataPack, MapLayout, TileDef } from './types';

/**
 * Thunder's Edge goes into a system with no planet, no supernova and no printed wormhole (TE rules).
 * Hyperlanes, home systems and Fracture systems are not candidates.
 */
export function validThundersEdgeSystem(tile: TileDef): boolean {
  return tile.kind === 'system'
    && tile.planetIds.length === 0
    && tile.wormholes.length === 0
    && tile.anomaly !== 'supernova'
    && tile.secondAnomaly !== 'supernova';
}

/** One 60 degree clockwise step on the axial grid. */
const turn = ({ q, r }: { q: number; r: number }, steps: number): { q: number; r: number } =>
  steps === 0 ? { q, r } : turn({ q: -r, r: q + r }, steps - 1);

/**
 * The seven Fracture systems as a chevron against the map: the part of ring A (the map's largest ring plus one) around
 * one corner, apex in the middle and three systems on each arm. The corner is the one nearest to the seat's home slot,
 * the top one without a seat; a corner whose slots touch the template is skipped, and the ring moves out if none is free.
 * Empty when the pack has no Fracture systems or there is no template.
 */
export function fractureSlots(
  seat: number | null, playerCount: number, pack: DataPack, layout?: MapLayout,
): { tileId: string; q: number; r: number }[] {
  const tileIds = Object.values(pack.tiles).filter(tile => tile.kind === 'fracture').map(tile => tile.id)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const template = slotsFor(playerCount, pack, layout);
  if (tileIds.length === 0 || template.length === 0) return [];
  const taken = new Set(template.map(s => slotKeyOf(s.q, s.r)));
  const home = seat === null ? undefined : seatSlots(playerCount, pack, layout)[seat - 1];
  const target = home === undefined ? 0 : clockwiseAngle(...(home.split(',').map(Number) as [number, number]));
  const gap = (corner: number): number => {
    const d = Math.abs(((corner * Math.PI) / 3) - target);
    return Math.min(d, 2 * Math.PI - d);
  };
  const corners = [0, 1, 2, 3, 4, 5].sort((a, b) => gap(a) - gap(b) || a - b);
  const ring = Math.max(...template.map(s => hexDistance(s.q, s.r))) + 1;
  for (let a = ring; ; a++) {
    const top = [[-3, 3 - a], [-2, 2 - a], [-1, 1 - a], [0, -a], [1, -a], [2, -a], [3, -a]];
    for (const corner of corners) {
      const slots = tileIds.map((tileId, i) => ({ tileId, ...turn({ q: top[i][0], r: top[i][1] }, corner) }));
      if (slots.every(s => !taken.has(slotKeyOf(s.q, s.r)))) return slots;
    }
  }
}
