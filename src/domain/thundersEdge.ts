import { clockwiseAngle, hexDistance, seatSlots, slotsFor } from './mapBuilder';
import { slotKeyOf } from './layouts';
import { isOnMap, isStation, planetsOf, tileIdOf } from './replay/board';
import { othersIn } from './replay/production';
import { violation } from './rules/registry';
import { withSlotsMoved } from './slotRename';
import type { DataPack, Entry, Game, GameState, MapLayout, Plan, TileDef, Warning } from './types';

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

/** The six grid neighbours of a slot. */
const NEIGHBOURS = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]];

/** At least this many of the seven systems against the map count as lying against its edge. */
const FLUSH = 5;

/**
 * The seven Fracture systems as a chevron against the map (TE: the Fracture is placed against the edge of the regular
 * map): the part of a ring around one corner, apex in the middle and three systems on each arm. Corners are tried
 * nearest to the seat's home slot first (the top one without a seat). At each corner the chevron goes on the ring where
 * it lies against the most systems of the map without covering any, so an uneven map (the alternate hyperlanes) does not
 * leave it hanging a ring away; the first corner where at least five of its systems touch the map wins, otherwise the
 * best placement of all. Empty when the pack has no Fracture systems or there is no template.
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
  const outer = Math.max(...template.map(s => hexDistance(s.q, s.r))) + 1;
  const chevron = (a: number, corner: number) => {
    const top = [[-3, 3 - a], [-2, 2 - a], [-1, 1 - a], [0, -a], [1, -a], [2, -a], [3, -a]];
    return tileIds.map((tileId, i) => ({ tileId, ...turn({ q: top[i][0], r: top[i][1] }, corner) }));
  };
  const touching = (slots: { q: number; r: number }[]): number =>
    slots.filter(s => NEIGHBOURS.some(([dq, dr]) => taken.has(slotKeyOf(s.q + dq, s.r + dr)))).length;
  /** At one corner, the free ring where the chevron touches the map most; the outer ring is always free. */
  const bestAt = (corner: number) => {
    let best = { slots: chevron(outer, corner), touch: touching(chevron(outer, corner)) };
    for (let a = 3; a < outer; a++) {
      const slots = chevron(a, corner);
      if (slots.some(s => taken.has(slotKeyOf(s.q, s.r)))) continue;
      const touch = touching(slots);
      if (touch > best.touch) best = { slots, touch };
    }
    return best;
  };
  const options = corners.map(bestAt);
  return (options.find(o => o.touch >= FLUSH) ?? options.reduce((a, b) => (b.touch > a.touch ? b : a))).slots;
}

/**
 * A saved open Fracture brought to where `fractureSlots` puts it now: its systems, and what the game says about them,
 * move along. Nothing changes when it already stands there.
 */
export function withFractureRealigned(game: Game, pack: DataPack): Game {
  if (!game.fracture.active || !game.fracture.tiles) return game;
  const now = new Map(fractureSlots(game.fracture.seat, game.playerCount, pack, game.layout).map(s => [s.tileId, slotKeyOf(s.q, s.r)]));
  const moved = new Map(Object.entries(game.fracture.tiles)
    .filter(([slot, tileId]) => now.has(tileId) && now.get(tileId) !== slot)
    .map(([slot, tileId]) => [slot, now.get(tileId)!]));
  if (moved.size === 0) return game;
  const next = withSlotsMoved(game, slot => moved.get(slot) ?? slot);
  return { ...next, fracture: { ...next.fracture, tiles: Object.fromEntries([...now].map(([tileId, slot]) => [slot, tileId])) } };
}

/**
 * The Fracture's systems take other slots when it moves, and what the game says about them follows: plans speak of a
 * system by its slot. `before` is the game as it stood; a Fracture that did not move leaves `next` as it is.
 */
export function withFractureMoved(before: Game, next: Game, pack: DataPack): Game {
  const place = (game: Game) => Object.fromEntries(fractureSlots(game.fracture.seat, game.playerCount, pack, game.layout).map(s => [s.tileId, slotKeyOf(s.q, s.r)]));
  const old = place(before);
  const now = place(next);
  const moved = new Map(Object.keys(old).filter(id => now[id] && now[id] !== old[id]).map(id => [old[id], now[id]]));
  if (moved.size === 0) return next;
  return withSlotsMoved(next, slot => moved.get(slot) ?? slot);
}

/** Check: ground forces cannot land on a space station (space stations 4). The landing itself is left as written. */
export const checkStationLandings = (entry: Extract<Entry, { type: 'tactical' }>, pack: DataPack): Warning[] =>
  entry.landings.filter(l => isStation(pack, l.planetId) && Object.values(l.units).some(n => (n ?? 0) > 0))
    .map(l => violation('stationGround', { planetId: l.planetId }));

/** Check: a structure cannot be put on a space station (space stations 4). */
export const checkStationStructures = (structures: { planetId: string }[], pack: DataPack): Warning[] =>
  structures.filter(s => isStation(pack, s.planetId)).map(s => violation('stationStructure', { planetId: s.planetId }));

/**
 * Effect: being the only player with units in a system gives control of its space stations (space stations 2); leaving
 * keeps it. Other players' ships still there mean a combat first, so nothing changes (2.1).
 */
export function claimStations(game: Game, state: GameState, systemId: string, pack: DataPack): void {
  const stations = planetsOf(game, systemId, pack).filter(id => isStation(pack, id));
  if (stations.length === 0 || othersIn(game, state, systemId, pack, true)) return;
  const mine = [state.systems[systemId], ...planetsOf(game, systemId, pack).map(id => state.ground[id])]
    .some(units => Object.values(units ?? {}).some(n => (n ?? 0) > 0));
  if (mine) for (const id of stations) state.control[id] = 'me';
}

// ui-logic-to-domain
/** Who holds each expedition part. */
export type SliceOwners = Record<string, 'me' | 'other'>;

/** Who holds each expedition part: mine come from the plan's expedition entries, the others' are tapped in. */
export function sliceOwners(game: Game, plan?: Plan): SliceOwners {
  const owners: SliceOwners = {};
  for (const [id, owner] of Object.entries(game.expedition.slices)) if (owner) owners[id] = owner;
  for (const round of plan?.rounds ?? []) {
    for (const entry of round.entries) {
      if (entry.type === 'expedition' && entry.sliceId && entry.status !== 'cancelled') owners[entry.sliceId] = 'me';
    }
  }
  return owners;
}

/** Whether Thunder's Edge can go into the system of a map slot (see `validThundersEdgeSystem`). */
export function validThundersEdgeSlot(game: Game, slot: string, pack: DataPack): boolean {
  const tile = isOnMap(game, slot) ? pack.tiles[tileIdOf(game, slot)] : undefined;
  return tile !== undefined && validThundersEdgeSystem(tile);
}
