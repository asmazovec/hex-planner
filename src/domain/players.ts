import type { DataPack, Game, Opponent } from './types';

/** An opponent, or me under the id `me`. */
export type Player = Opponent;

export const MIN_PLAYERS = 3;
export const COLORS = 8;

/** Everyone in list order: my faction first. A player's number is the position in this list plus one. */
export const playersOf = (game: Game): Player[] => [
  { id: 'me', faction: game.faction, vp: game.vp, seat: game.seat, color: game.color }, ...game.opponents,
];

/** The opponent an enemy planet belongs to: its owner, or the first opponent when it has none. */
export const planetHolder = (game: Pick<Game, 'opponents' | 'planetOwner'>, planetId: string): string | undefined =>
  game.opponents.find(o => o.id === game.planetOwner[planetId])?.id ?? game.opponents[0]?.id;

/**
 * The game as an opponent plays it: they are the player, what they hold is theirs, what I hold is an enemy's, and their
 * opponents are the others, me among them under the id `me`. My units are not in the game: the replay gives their routes
 * my ships (`blockersOf`). For me, or for someone gone, it is the game itself.
 */
export function gameAs(game: Game, owner: string | undefined): Game {
  const rival = game.opponents.find(o => o.id === owner);
  if (!rival) return game;
  const without = (record: Game['enemyUnits']): Game['enemyUnits'] => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => {
    const { [rival.id]: mine, ...others } = byOwner;
    void mine;
    return Object.keys(others).length > 0 ? [[place, others]] : [];
  }));
  const holderOf = (id: string): string => (game.planetControl[id] === 'enemy' ? planetHolder(game, id) ?? 'me' : 'me');
  const enemyPlanets = Object.keys(game.planetControl).filter(id => holderOf(id) !== rival.id);
  return {
    ...game,
    faction: rival.faction, seat: rival.seat, color: rival.color, vp: rival.vp,
    opponents: playersOf(game).filter(p => p.id !== rival.id),
    start: { me: game.start.opponents[rival.id] ?? {}, opponents: { ...Object.fromEntries(Object.entries(game.start.opponents).filter(([id]) => id !== rival.id)), me: game.start.me } },
    planetControl: Object.fromEntries(Object.keys(game.planetControl).map(id => [id, enemyPlanets.includes(id) ? 'enemy' as const : 'me' as const])),
    planetOwner: { ...game.planetOwner, ...Object.fromEntries(enemyPlanets.map(id => [id, holderOf(id)])) },
    enemyUnits: without(game.enemyUnits),
    enemyGround: without(game.enemyGround),
  };
}

/** The most players the map templates of the pack allow. */
export const maxPlayers = (pack: DataPack): number => Math.max(MIN_PLAYERS, ...pack.templates.map(t => t.playerCount));

/** The map tile of a faction's home: its gate when the planets lie on an off-map tile. */
export const homeTileOnMap = (faction: string, pack: DataPack): string | undefined => {
  const def = pack.factions[faction];
  return def?.gateTile ?? def?.homeTile;
};

export const homePlanets = (faction: string, pack: DataPack): string[] =>
  pack.tiles[pack.factions[faction]?.homeTile ?? '']?.planetIds ?? [];
