import { defaultLayout, LAYOUT_CHOICES, slotKeyOf, templateFor, templateOf } from './layouts';
import type { DataPack, MapLayout, MapTemplate, TileDef } from './types';

export { defaultLayout, LAYOUT_CHOICES, templateFor };

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
  const found = lookUpTile(input, pack);
  return typeof found === 'string' ? null : found;
}

/** Like `resolveTile`, but says why nothing was found: a number two sides share, or no such tile (empty input too). */
export function lookUpTile(input: string, pack: DataPack): TileDef | 'ambiguous' | 'unknown' {
  const q = input.trim().toUpperCase();
  if (q === '') return 'unknown';
  const tiles = Object.values(pack.tiles);
  const exact = tiles.find(tile => tile.id.toUpperCase() === q);
  if (exact) return exact;
  const sameNumber = tiles.filter(tile => tile.number.toUpperCase() === q);
  return sameNumber.length === 1 ? sameNumber[0] : sameNumber.length > 1 ? 'ambiguous' : 'unknown';
}

/** The hyperlane sides that Milty Draft's 3 and 4 player maps use in several slots. */
const MILTY_REPEATED_LANES = ['83A', '85A', '87A'];

/**
 * Tile ids placed in more than one slot, in order of first repeat. Rotation is ignored. With a pack, the three sides the
 * Milty Draft layouts repeat (83A, 85A, 87A) are left out.
 */
export function duplicateTiles(map: Record<string, string>, pack?: DataPack): string[] {
  const repeatable = pack ? new Set(MILTY_REPEATED_LANES) : new Set<string>();
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of Object.values(map)) {
    const id = value.split('@')[0];
    if (repeatable.has(id)) continue;
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}



export const hexDistance = (q: number, r: number): number => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

/** Clockwise angle from north (the top of the map), 0 up to 2π; flat-top axial grid. */
export const clockwiseAngle = (q: number, r: number): number => {
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

const isLane = (fixed: string | undefined, pack: DataPack): fixed is string =>
  fixed !== undefined && pack.tiles[fixed.split('@')[0]]?.kind === 'hyperlane';

/**
 * A map moved to another template. Hyperlanes of the new template always go in, displacing whatever stands on their
 * slots. Other tiles stay in the slots both templates have, except fixed tiles the player never changed, which belong to
 * the old template and leave with it; the new template's other fixed tile (the centre) fills an empty slot.
 */
export function moveToTemplate(from: Record<string, string>, oldSlots: MapTemplate['slots'], next: MapTemplate, pack: DataPack): Record<string, string> {
  const oldFixed = new Map(oldSlots.map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const present = new Set(next.slots.map(s => slotKeyOf(s.q, s.r)));
  const map: Record<string, string> = {};
  for (const [slot, tile] of Object.entries(from)) {
    if (present.has(slot) && oldFixed.get(slot) !== tile) map[slot] = tile;
  }
  for (const slot of next.slots) {
    const key = slotKeyOf(slot.q, slot.r);
    if (slot.fixed && (isLane(slot.fixed, pack) || !(key in map))) map[key] = slot.fixed;
  }
  return map;
}

// ui-logic-to-domain (P2-251, P2-252)
/** The layouts a player count can choose from; empty when it has only one. */
export const layoutChoices = (playerCount: number): MapLayout[] => LAYOUT_CHOICES[playerCount] ?? [];

/** Whether a layout is Milty Draft's own, not a layout of the rules: the hyperlanes of three and four players. */
export const isMiltyLanes = (playerCount: number, layout: MapLayout = 'hyperlanes'): boolean =>
  layout === 'hyperlanes' && (playerCount === 3 || playerCount === 4);

/** How many slots of a player count's layout hold a fixed hyperlane. */
export const hyperlaneSlotCount = (playerCount: number, pack: DataPack, layout: MapLayout = 'hyperlanes'): number =>
  (templateFor(playerCount, layout, pack)?.slots ?? []).filter(slot => slot.fixed && pack.tiles[slot.fixed.split('@')[0]]?.kind === 'hyperlane').length;
