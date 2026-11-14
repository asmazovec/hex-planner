/**
 * Edits of the table of a saved game before it starts: the name of the game and the tiles of the map. Each takes the
 * saved game and hands back the same one when nothing changed. Pinned 1:1 against the old edits of `Game`
 * (`table.test.ts`). The edits of the players, the layout and the expansions are still written over the old game.
 */
import type { Slot, TileRef } from '../types';
import type { SavedGame } from '../save';

/** The name of the game, trimmed; an empty one takes it away. */
export function withName(saved: SavedGame, name: string): SavedGame {
  const next = name.trim();
  if (next === (saved.name ?? '')) return saved;
  const { name: old, ...rest } = saved;
  void old;
  return { ...rest, ...(next ? { name: next } : {}), table: { ...saved.table, name: next } };
}

/** A tile set on a slot of the map, or taken off it when `tile` is null. */
export function withTile(saved: SavedGame, slot: Slot, tile: TileRef | null): SavedGame {
  const { map } = saved.table;
  if (tile === null ? !(slot in map) : map[slot] === tile) return saved;
  const next = { ...map };
  if (tile === null) delete next[slot];
  else next[slot] = tile;
  return { ...saved, table: { ...saved.table, map: next } };
}
