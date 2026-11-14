/** The board as the steps read it: which slots hold systems, their tiles, anomalies and planets. */
import { areAdjacent, type Adjacency } from '../route';
import type { Anomaly, DataPack, PlanetDef } from '../types';
import type { TableFacts } from '../facts';

/** What the board of systems is read from: the map, the Fracture, who sits at the table. An old game is one; so is what the game kernel makes of a table and a board. */
export type MapSource = Pick<TableFacts, 'map' | 'fracture' | 'faction' | 'opponents' | 'expedition'>;

export const THUNDERS_EDGE_PLANET = 'thundersedge';

export const tileIdOf = (game: MapSource, systemId: string): string => (game.map[systemId] ?? game.fracture.tiles?.[systemId] ?? systemId).split('@')[0];

/** Whether a slot holds a system ships can go to: a tile of the map, or of the open Fracture. */
export const isOnMap = (game: MapSource, slot: string): boolean => game.map[slot] !== undefined || game.fracture.tiles?.[slot] !== undefined;

/** An ingress of the Fracture and one of its egress systems, either way round (Thunder's Edge, The Fracture 5). */
const ingressToEgress = (game: MapSource, a: string, b: string, pack: DataPack): boolean =>
  game.fracture.tiles?.[b] !== undefined && (game.fracture.ingress ?? []).includes(a) && tileAt(game, b, pack)?.egress === true;

/**
 * Grid neighbours, except across the edge of the Fracture: its systems do not touch the map they stand next to. With the
 * pack, also each ingress and each egress of the open Fracture, which are not grid neighbours (so drawing, given no pack, leaves a gap).
 */
export const systemsAdjacent = (game: MapSource, pack?: DataPack): Adjacency => (a, b) =>
  (areAdjacent(a, b) && Boolean(game.fracture.tiles?.[a]) === Boolean(game.fracture.tiles?.[b]))
  || (pack !== undefined && (ingressToEgress(game, a, b, pack) || ingressToEgress(game, b, a, pack)));

/** Every slot holding a system. */
export const systemSlots = (game: MapSource): string[] => [...Object.keys(game.map), ...Object.keys(game.fracture.tiles ?? {})];

export const tileAt = (game: MapSource, slot: string, pack: DataPack) => pack.tiles[tileIdOf(game, slot)];
export const isLane = (game: MapSource, slot: string, pack: DataPack): boolean => tileAt(game, slot, pack)?.kind === 'hyperlane';

export const hasAnomaly = (game: MapSource, slot: string, anomaly: Anomaly, pack: DataPack): boolean => {
  const tile = tileAt(game, slot, pack);
  return tile?.anomaly === anomaly || tile?.secondAnomaly === anomaly;
};

/** A space station (Thunder's Edge): counted among the planets, but taken by ships and holding no ground forces or structures. */
export const isStation = (pack: DataPack, planetId: string): boolean => pack.planets[planetId]?.station === true;

/** Planets of a system; the Thunder's Edge planet belongs to the system the expedition put it in. */
export function planetsOf(game: MapSource, systemId: string, pack: DataPack): string[] {
  const planets = [...(pack.tiles[tileIdOf(game, systemId)]?.planetIds ?? [])];
  if (game.expedition.thundersEdgeSystem === systemId && pack.planets[THUNDERS_EDGE_PLANET]) {
    planets.push(THUNDERS_EDGE_PLANET);
  }
  return planets;
}

/** Planet definitions of a system, including Thunder's Edge when the expedition placed it there. */
export const systemPlanets = (game: MapSource, systemId: string, pack: DataPack): PlanetDef[] =>
  planetsOf(game, systemId, pack).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined);

/** The system a move leaves: its `from`, or for a planet pickup the system holding that planet. */
export function sourceSlot(game: MapSource, pack: DataPack, from: string): string | null {
  if (!(from in pack.planets)) return from;
  const found = systemSlots(game).find(slot => planetsOf(game, slot, pack).includes(from));
  if (found !== undefined) return found;
  // A planet of an off-map home (the Creuss home, 6 note 2) lies in that home, which stands under its tile id.
  const onMap = (tile: string | undefined) => tile !== undefined && Object.values(game.map).some(id => id.split('@')[0] === tile);
  const home = Object.values(pack.factions).find(f => f.gateTile !== undefined && onMap(f.gateTile) && !onMap(f.homeTile) && pack.tiles[f.homeTile]?.planetIds.includes(from));
  return home?.homeTile ?? null;
}
