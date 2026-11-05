import { defaultLayout, templateFor, templateOf } from './layouts';
import type { DataPack, Game, MapLayout, MapTemplate, TileDef } from './types';
import { slotKeyOf } from './newGame';

export { defaultLayout, templateFor };

/** Slots of the map template for a player count and layout; empty when there is none. */
export const slotsFor = (playerCount: number, pack: DataPack, layout?: MapLayout): MapTemplate['slots'] =>
  templateOf(playerCount, pack, layout)?.slots ?? [];

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

/**
 * Tile ids placed in more than one slot, in order of first repeat. Rotation is ignored. With a pack, hyperlanes are left
 * out: the layouts of Milty Draft repeat the same side in several slots.
 */
export function duplicateTiles(map: Game['map'], pack?: DataPack): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of Object.values(map)) {
    const id = value.split('@')[0];
    if (pack?.tiles[id]?.kind === 'hyperlane') continue;
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/** True while the map holds nothing beyond the tiles its template places by itself. */
export function mapIsEmpty(game: Game, pack: DataPack): boolean {
  const fixed = new Set(slotsFor(game.playerCount, pack, game.layout).filter(s => s.fixed).map(s => slotKeyOf(s.q, s.r)));
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
 * Uses the home slots of the template; a template without them gives each seat the outer-ring slot nearest to
 * the angle seat * 360 / playerCount, clockwise from the top.
 */
export function seatSlots(playerCount: number, pack: DataPack, layout?: MapLayout): string[] {
  const template = templateOf(playerCount, pack, layout);
  if (!template || template.slots.length === 0 || playerCount < 1) return [];
  if (template.homes?.length === playerCount) return template.homes;
  const slots = template.slots;
  const outer = Math.max(...slots.map(s => hexDistance(s.q, s.r)));
  const ring = slots.filter(s => hexDistance(s.q, s.r) === outer);
  const gap = (a: number, b: number): number => Math.min(Math.abs(a - b), 2 * Math.PI - Math.abs(a - b));
  return Array.from({ length: playerCount }, (_, i) => {
    const target = (i * 2 * Math.PI) / playerCount;
    const best = ring.reduce((x, y) => (gap(clockwiseAngle(y.q, y.r), target) < gap(clockwiseAngle(x.q, x.r), target) - 1e-9 ? y : x));
    return slotKeyOf(best.q, best.r);
  });
}

/**
 * The game with another layout of its player count: tiles stay in the slots both layouts have, except fixed tiles the
 * player never changed, which belong to the old layout and leave with it. Then the new layout's fixed tiles (the centre
 * and its hyperlanes) fill the slots that are empty. A layout the pack lacks, or the one in use, returns the same game.
 */
export function changeLayout(game: Game, layout: MapLayout, pack: DataPack): Game {
  const next = templateFor(game.playerCount, layout, pack);
  if (!next || game.layout === layout) return game;
  const oldFixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const present = new Set(next.slots.map(s => slotKeyOf(s.q, s.r)));
  const map: Game['map'] = {};
  for (const [slot, tile] of Object.entries(game.map)) {
    if (present.has(slot) && oldFixed.get(slot) !== tile) map[slot] = tile;
  }
  for (const slot of next.slots) {
    const key = slotKeyOf(slot.q, slot.r);
    if (slot.fixed && !(key in map)) map[key] = slot.fixed;
  }
  return { ...game, layout, map };
}
