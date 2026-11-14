import type { DataPack } from './types';
import type { TableFacts } from './facts';

/** An opponent, or me under the id `me`. */
export interface Player {
  /** Stable: survives seat swaps, faction changes and the removal of other opponents. */
  id: string;
  faction: string;
  vp: number;
  seat: number;
  color: number;
}


export const MIN_PLAYERS = 3;
export const COLORS = 8;

/** Everyone in list order: my faction first. A player's number is the position in this list plus one. */
export const playersOf = (game: TableFacts & { vp: number; color: number }): Player[] => [
  { id: 'me', faction: game.faction, vp: game.vp, seat: game.seat, color: game.color }, ...game.opponents,
];

/** The opponent an enemy planet belongs to: its owner, or the first opponent when it has none. */
export const planetHolder = (game: Pick<TableFacts, 'opponents' | 'planetOwner'>, planetId: string): string | undefined =>
  game.opponents.find(o => o.id === game.planetOwner[planetId])?.id ?? game.opponents[0]?.id;

/** The most players the map templates of the pack allow. */
export const maxPlayers = (pack: DataPack): number => Math.max(MIN_PLAYERS, ...pack.templates.map(t => t.playerCount));

/** The map tile of a faction's home: its gate when the planets lie on an off-map tile. */
export const homeTileOnMap = (faction: string, pack: DataPack): string | undefined => {
  const def = pack.factions[faction];
  return def?.gateTile ?? def?.homeTile;
};

export const homePlanets = (faction: string, pack: DataPack): string[] =>
  pack.tiles[pack.factions[faction]?.homeTile ?? '']?.planetIds ?? [];
