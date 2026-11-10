import { systemPlanets, tileIdOf } from './replay/board';
import type { Anomaly, DataPack, Game, TileDef } from './types';

/** What a system can be called by, with no words of any language: the screen puts them together. */
export interface SystemName {
  /** Names of its planets, by the alphabet: the pack keeps them in no order a player knows. */
  planets: string[];
  /** The number printed on the tile (`F3` in the Fracture); the slot's own value when the tile is not known. */
  number: string;
  /** Null when the slot holds no known tile. */
  kind: TileDef['kind'] | null;
  anomalies: Anomaly[];
  wormholes: string[];
}

/** The planets, number and marks of the system in a slot of the map or of the open Fracture. */
export function systemNameOf(game: Game, pack: DataPack, slot: string): SystemName {
  const tileId = tileIdOf(game, slot);
  const tile = pack.tiles[tileId];
  if (!tile) return { planets: [], number: tileId, kind: null, anomalies: [], wormholes: [] };
  return {
    planets: systemPlanets(game, slot, pack).map(p => p.name).sort((a, b) => a.localeCompare(b, 'en')),
    number: tile.kind === 'fracture' ? `F${tileId.replace(/\D/g, '')}` : tile.number,
    kind: tile.kind,
    anomalies: [tile.anomaly, tile.secondAnomaly].filter((a): a is Anomaly => a !== undefined),
    wormholes: tile.wormholes,
  };
}
