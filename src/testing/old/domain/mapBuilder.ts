/** The questions and edits of the map over the old game (me, then the opponents): what the table edits of the kernel are pinned against. */
import { slotKeyOf } from '../../../domain/newGame';
import { moveToTemplate, seatSlots, slotsFor, templateFor } from '../../../domain/mapBuilder';
import type { DataPack, MapLayout } from '../../../domain/types';
import type { Game } from './types';

/** Slots holding a player's own home tile at that player's seat; the app places and moves those tiles by itself. */
export function ownHomeSlots(game: Game, pack: DataPack): Set<string> {
  const slots = seatSlots(game.playerCount, pack, game.layout);
  const own = new Set<string>();
  for (const { faction, seat } of [game, ...game.opponents]) {
    const def = pack.factions[faction];
    const slot = slots[seat - 1];
    if (def && slot && game.map[slot]?.split('@')[0] === (def.gateTile ?? def.homeTile)) own.add(slot);
  }
  return own;
}

/** True while the map holds nothing beyond the tiles its template places and the players' own home tiles. */
export function mapIsEmpty(game: Game, pack: DataPack): boolean {
  const fixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const own = ownHomeSlots(game, pack);
  return Object.entries(game.map).every(([slot, tile]) => fixed.get(slot) === tile || own.has(slot));
}
/** A game with its map given as a plain record, so a literal map type does not narrow what is read back. */
type Mapped<G extends Game> = Omit<G, 'map'> & { map: Game['map'] };

/**
 * The game with another layout of its player count; a layout the pack lacks, or the one in use, returns the same game.
 * The map moves as `moveToTemplate` moves it, and each player's own home tile goes to that player's seat slot in the new
 * layout, displacing what stands there, since layouts can put the homes elsewhere (the Large Galaxy, seven players).
 */
export function changeLayout<G extends Game>(game: G, layout: MapLayout, pack: DataPack): Mapped<G> {
  const next = templateFor(game.playerCount, layout, pack);
  if (!next || game.layout === layout) return game as Mapped<G>;
  const own = ownHomeSlots(game, pack);
  const lifted = Object.fromEntries(Object.entries(game.map).filter(([slot]) => !own.has(slot)));
  const map = moveToTemplate(lifted, slotsFor(game.playerCount, pack, game.layout), next, pack);
  const seats = seatSlots(game.playerCount, pack, layout);
  for (const { faction, seat } of [game, ...game.opponents]) {
    const def = pack.factions[faction];
    const slot = seats[seat - 1];
    if (def && slot) map[slot] = def.gateTile ?? def.homeTile;
  }
  return { ...game, layout, map };
}

/**
 * How many tiles of the player a switch to `layout` removes: those in slots it lacks, those under its hyperlanes and
 * those on its seats. The players' own home tiles move with their seats and are not counted.
 */
export function tilesLostByLayout(game: Game, layout: MapLayout, pack: DataPack): number {
  const next = templateFor(game.playerCount, layout, pack);
  if (!next || game.layout === layout) return 0;
  const kept = changeLayout(game, layout, pack).map;
  const own = ownHomeSlots(game, pack);
  const oldFixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  return Object.entries(game.map).filter(([slot, tile]) => !own.has(slot) && oldFixed.get(slot) !== tile && kept[slot] !== tile).length;
}


/**
 * Slots the player fills by hand, in template order: neither a tile the template fixes (the centre, hyperlanes) nor a
 * seat's home, which the app places itself.
 */
export function freeSlots(game: Game, pack: DataPack): string[] {
  const seats = new Set(seatSlots(game.playerCount, pack, game.layout));
  return slotsFor(game.playerCount, pack, game.layout)
    .filter(slot => !slot.fixed)
    .map(slot => slotKeyOf(slot.q, slot.r))
    .filter(key => !seats.has(key));
}

/** Free slots that still hold no tile: the map is not built while there are any. */
export const emptySlots = (game: Game, pack: DataPack): string[] => freeSlots(game, pack).filter(key => !game.map[key]);

/** The game with the tiles of `from` put back in its free slots that are empty, when the pack still has them. */
export function withPlacedTiles<G extends Game>(game: G, from: Game['map'], pack: DataPack): Mapped<G> {
  const back = freeSlots(game, pack).filter(key => !game.map[key] && from[key] && pack.tiles[from[key].split('@')[0]]);
  if (back.length === 0) return game as Mapped<G>;
  return { ...game, map: { ...game.map, ...Object.fromEntries(back.map(key => [key, from[key]])) } };
}

/** Whether the game is set up to play: every opponent has a faction and every free slot holds a tile. */
export const readyToPlay = (game: Game, pack: DataPack): boolean =>
  game.opponents.every(opponent => opponent.faction !== '') && emptySlots(game, pack).length === 0;
