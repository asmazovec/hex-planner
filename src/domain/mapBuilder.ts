import type { DataPack, Game, MapTemplate, TileDef } from './types';

/** Slots of the map template for a player count; empty when there is none. */
export const slotsFor = (playerCount: number, pack: DataPack): MapTemplate['slots'] =>
  pack.templates.find(template => template.playerCount === playerCount)?.slots ?? [];

const byNumber = (a: TileDef, b: TileDef): number =>
  a.number.localeCompare(b.number, 'en', { numeric: true }) || a.id.localeCompare(b.id, 'en', { numeric: true });

/** Tiles of the pack whose number or id starts with the query. The pack holds only enabled expansions. */
export function tileSuggestions(query: string, pack: DataPack): TileDef[] {
  const q = query.trim().toUpperCase();
  if (q === '') return [];
  return Object.values(pack.tiles)
    .filter(tile => tile.id.toUpperCase().startsWith(q) || tile.number.toUpperCase().startsWith(q))
    .sort(byNumber);
}

/**
 * Turns typed text into a tile: an exact id, or a number that names one tile.
 * A number shared by two sides (83) is ambiguous and gives null.
 */
export function resolveTile(input: string, pack: DataPack): TileDef | null {
  const q = input.trim().toUpperCase();
  if (q === '') return null;
  const tiles = Object.values(pack.tiles);
  const exact = tiles.find(tile => tile.id.toUpperCase() === q);
  if (exact) return exact;
  const sameNumber = tiles.filter(tile => tile.number.toUpperCase() === q);
  return sameNumber.length === 1 ? sameNumber[0] : null;
}

/** Tile ids placed in more than one slot, in order of first repeat. Rotation is ignored. */
export function duplicateTiles(map: Game['map']): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of Object.values(map)) {
    const id = value.split('@')[0];
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/** True while the map holds nothing beyond the tiles its template places by itself. */
export function mapIsEmpty(game: Game, pack: DataPack): boolean {
  const fixed = new Set(slotsFor(game.playerCount, pack).filter(s => s.fixed).map(s => `${s.q},${s.r}`));
  return Object.keys(game.map).every(slot => fixed.has(slot));
}
