/** The board as the steps read it: which slots hold systems, their tiles, anomalies and planets. */
import { areAdjacent, type Adjacency } from '../route';
import type { Anomaly, DataPack, Game, PlanetDef } from '../types';

export const THUNDERS_EDGE_PLANET = 'thundersedge';

export const tileIdOf = (game: Game, systemId: string): string => (game.map[systemId] ?? game.fracture.tiles?.[systemId] ?? systemId).split('@')[0];

/** Whether a slot holds a system ships can go to: a tile of the map, or of the open Fracture. */
export const isOnMap = (game: Game, slot: string): boolean => game.map[slot] !== undefined || game.fracture.tiles?.[slot] !== undefined;

/** An ingress of the Fracture and one of its egress systems, either way round (Thunder's Edge, The Fracture 5). */
const ingressToEgress = (game: Game, a: string, b: string, pack: DataPack): boolean =>
  game.fracture.tiles?.[b] !== undefined && (game.fracture.ingress ?? []).includes(a) && tileAt(game, b, pack)?.egress === true;

/**
 * Grid neighbours, except across the edge of the Fracture: its systems do not touch the map they stand next to. With the
 * pack, also each ingress and each egress of the open Fracture, which are not grid neighbours (so drawing, given no pack, leaves a gap).
 */
export const systemsAdjacent = (game: Game, pack?: DataPack): Adjacency => (a, b) =>
  (areAdjacent(a, b) && Boolean(game.fracture.tiles?.[a]) === Boolean(game.fracture.tiles?.[b]))
  || (pack !== undefined && (ingressToEgress(game, a, b, pack) || ingressToEgress(game, b, a, pack)));

/** Every slot holding a system. */
export const systemSlots = (game: Game): string[] => [...Object.keys(game.map), ...Object.keys(game.fracture.tiles ?? {})];

export const tileAt = (game: Game, slot: string, pack: DataPack) => pack.tiles[tileIdOf(game, slot)];
export const isLane = (game: Game, slot: string, pack: DataPack): boolean => tileAt(game, slot, pack)?.kind === 'hyperlane';

export const hasAnomaly = (game: Game, slot: string, anomaly: Anomaly, pack: DataPack): boolean => {
  const tile = tileAt(game, slot, pack);
  return tile?.anomaly === anomaly || tile?.secondAnomaly === anomaly;
};

/** A space station (Thunder's Edge): counted among the planets, but taken by ships and holding no ground forces or structures. */
export const isStation = (pack: DataPack, planetId: string): boolean => pack.planets[planetId]?.station === true;

/** Planets of a system; the Thunder's Edge planet belongs to the system the expedition put it in. */
export function planetsOf(game: Game, systemId: string, pack: DataPack): string[] {
  const planets = [...(pack.tiles[tileIdOf(game, systemId)]?.planetIds ?? [])];
  if (game.expedition.thundersEdgeSystem === systemId && pack.planets[THUNDERS_EDGE_PLANET]) {
    planets.push(THUNDERS_EDGE_PLANET);
  }
  return planets;
}

/** Planet definitions of a system, including Thunder's Edge when the expedition placed it there. */
export const systemPlanets = (game: Game, systemId: string, pack: DataPack): PlanetDef[] =>
  planetsOf(game, systemId, pack).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined);

/** The system a move leaves: its `from`, or for a planet pickup the system holding that planet. */
export function sourceSlot(game: Game, pack: DataPack, from: string): string | null {
  if (!(from in pack.planets)) return from;
  return systemSlots(game).find(slot => planetsOf(game, slot, pack).includes(from)) ?? null;
}
