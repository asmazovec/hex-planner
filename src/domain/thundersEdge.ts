import { clockwiseAngle, hexDistance, seatSlots, slotsFor } from './mapBuilder';
import { slotKeyOf } from './layouts';
import { isOnMap, isStation, planetsOf, tileIdOf } from './replay/board';
import { othersIn } from './replay/production';
import { violation } from './rules/registry';
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

function movedEntry(entry: Entry, to: (slot: string) => string): Entry {
  if (entry.type === 'tactical') {
    return {
      ...entry,
      systemId: entry.systemId === null ? null : to(entry.systemId),
      moves: entry.moves.map(move => ({
        ...move, from: to(move.from),
        ...(move.via ? { via: move.via.map(to) } : {}),
        ...(move.pickupOf === undefined ? {} : { pickupOf: to(move.pickupOf) }),
      })),
    };
  }
  if (entry.type === 'strategic' || entry.type === 'secondary') {
    const { effects } = entry;
    if (!effects) return entry;
    return {
      ...entry,
      effects: {
        ...effects,
        ...(effects.systemId === undefined ? {} : { systemId: to(effects.systemId) }),
        ...(effects.production ? { production: { ...effects.production, systemId: to(effects.production.systemId) } } : {}),
      },
    };
  }
  if (entry.type === 'adjustment' && entry.delta.units) {
    return { ...entry, delta: { ...entry.delta, units: { ...entry.delta.units, systemId: to(entry.delta.units.systemId) } } };
  }
  return entry;
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
  const to = (slot: string): string => moved.get(slot) ?? slot;
  return {
    ...next,
    enemyUnits: Object.fromEntries(Object.entries(next.enemyUnits).map(([slot, units]) => [to(slot), units])),
    fracture: { ...next.fracture, ingress: next.fracture.ingress.map(to) },
    plans: next.plans.map(plan => ({
      ...plan,
      rounds: plan.rounds.map(round => ({ ...round, entries: round.entries.map(entry => movedEntry(entry, to)) })),
    })),
  };
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
