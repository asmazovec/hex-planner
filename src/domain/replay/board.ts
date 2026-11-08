/** The board as the steps read it: which slots hold systems, their tiles, anomalies and planets. */
import { areAdjacent, type Adjacency } from '../route';
import type { Anomaly, DataPack, Game, PlanetDef } from '../types';

export const THUNDERS_EDGE_PLANET = 'thundersedge';

export const tileIdOf = (game: Game, systemId: string): string => (game.map[systemId] ?? game.fracture.tiles?.[systemId] ?? systemId).split('@')[0];

/** Whether a slot holds a system ships can go to: a tile of the map, or of the open Fracture. */
export const isOnMap = (game: Game, slot: string): boolean => game.map[slot] !== undefined || game.fracture.tiles?.[slot] !== undefined;

/** Grid neighbours, except across the edge of the Fracture: its systems do not touch the map they stand next to. */
// TODO(P2-049) #ws:thunders-edge #type:model #rule:fracture-5 #test:te-fracture #size:m #fracture — Входы Излома (game.fracture.ingress) не смежны с его выходами (TileDef.egress): в Излом нельзя проложить маршрут
export const systemsAdjacent = (game: Game): Adjacency => (a, b) =>
  areAdjacent(a, b) && Boolean(game.fracture.tiles?.[a]) === Boolean(game.fracture.tiles?.[b]);

/** Every slot holding a system. */
export const systemSlots = (game: Game): string[] => [...Object.keys(game.map), ...Object.keys(game.fracture.tiles ?? {})];

export const tileAt = (game: Game, slot: string, pack: DataPack) => pack.tiles[tileIdOf(game, slot)];
export const isLane = (game: Game, slot: string, pack: DataPack): boolean => tileAt(game, slot, pack)?.kind === 'hyperlane';

export const hasAnomaly = (game: Game, slot: string, anomaly: Anomaly, pack: DataPack): boolean => {
  const tile = tileAt(game, slot, pack);
  return tile?.anomaly === anomaly || tile?.secondAnomaly === anomaly;
};

/** Planets of a system; the Thunder's Edge planet belongs to the system the expedition put it in. */
// TODO(P2-048) #ws:thunders-edge #type:model #rule:space-stations-2 #rule:space-stations-4 #test:te-space-stations #size:m #space-station — Станция — обычная планета: контроль берётся высадкой, пехота и строения ставятся на неё. Нужен признак станции и контроль присутствием кораблей
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
