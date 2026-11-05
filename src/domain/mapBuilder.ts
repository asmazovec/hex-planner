import type { DataPack, Game, MapTemplate, TileDef } from './types';
import { slotKeyOf } from './newGame';

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

const hexDistance = (q: number, r: number): number => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

/** Clockwise angle from north (the top of the map), 0 up to 2π; flat-top axial grid. */
const clockwiseAngle = (q: number, r: number): number => {
  const x = 1.5 * q;
  const y = Math.sqrt(3) * (q / 2 + r);
  return (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI);
};

/**
 * Slot keys of the home positions in seat order: seat 1 at the top, then clockwise.
 * Uses the template's home slots if it has them; otherwise each seat takes the outer-ring slot nearest to
 * the angle seat * 360 / playerCount, clockwise from the top.
 */
export function seatSlots(playerCount: number, pack: DataPack): string[] {
  const slots = slotsFor(playerCount, pack);
  if (slots.length === 0 || playerCount < 1) return [];
  const byAngle = (list: { q: number; r: number }[]) =>
    [...list].sort((a, b) => clockwiseAngle(a.q, a.r) - clockwiseAngle(b.q, b.r));
  const homes = slots.filter(s => s.fixed !== undefined && pack.tiles[s.fixed.split('@')[0]]?.kind === 'home');
  if (homes.length === playerCount) return byAngle(homes).map(s => slotKeyOf(s.q, s.r));
  const outer = Math.max(...slots.map(s => hexDistance(s.q, s.r)));
  const ring = slots.filter(s => hexDistance(s.q, s.r) === outer);
  const gap = (a: number, b: number): number => Math.min(Math.abs(a - b), 2 * Math.PI - Math.abs(a - b));
  return Array.from({ length: playerCount }, (_, i) => {
    const target = (i * 2 * Math.PI) / playerCount;
    const best = ring.reduce((x, y) => (gap(clockwiseAngle(y.q, y.r), target) < gap(clockwiseAngle(x.q, x.r), target) - 1e-9 ? y : x));
    return slotKeyOf(best.q, best.r);
  });
}
