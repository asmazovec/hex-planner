import { defaultLayout, LAYOUT_CHOICES, slotKeyOf, templateFor, templateOf } from './layouts';
import type { DataPack, MapLayout, MapTemplate, TileDef } from './types';
import type { TableFacts } from './facts';

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
export function duplicateTiles(map: TableFacts['map'], pack?: DataPack): string[] {
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

/** Slots holding a player's own home tile at that player's seat; the app places and moves those tiles by itself. */
export function ownHomeSlots(game: TableFacts, pack: DataPack): Set<string> {
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
export function mapIsEmpty(game: TableFacts, pack: DataPack): boolean {
  const fixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const own = ownHomeSlots(game, pack);
  return Object.entries(game.map).every(([slot, tile]) => fixed.get(slot) === tile || own.has(slot));
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
export function moveToTemplate(from: TableFacts['map'], oldSlots: MapTemplate['slots'], next: MapTemplate, pack: DataPack): TableFacts['map'] {
  const oldFixed = new Map(oldSlots.map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const present = new Set(next.slots.map(s => slotKeyOf(s.q, s.r)));
  const map: TableFacts['map'] = {};
  for (const [slot, tile] of Object.entries(from)) {
    if (present.has(slot) && oldFixed.get(slot) !== tile) map[slot] = tile;
  }
  for (const slot of next.slots) {
    const key = slotKeyOf(slot.q, slot.r);
    if (slot.fixed && (isLane(slot.fixed, pack) || !(key in map))) map[key] = slot.fixed;
  }
  return map;
}

/** A game with its map given as a plain record, so a literal map type does not narrow what is read back. */
type Mapped<G extends TableFacts> = Omit<G, 'map'> & { map: TableFacts['map'] };

/**
 * The game with another layout of its player count; a layout the pack lacks, or the one in use, returns the same game.
 * The map moves as `moveToTemplate` moves it, and each player's own home tile goes to that player's seat slot in the new
 * layout, displacing what stands there, since layouts can put the homes elsewhere (the Large Galaxy, seven players).
 */
export function changeLayout<G extends TableFacts>(game: G, layout: MapLayout, pack: DataPack): Mapped<G> {
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
export function tilesLostByLayout(game: TableFacts, layout: MapLayout, pack: DataPack): number {
  const next = templateFor(game.playerCount, layout, pack);
  if (!next || game.layout === layout) return 0;
  const kept = changeLayout(game, layout, pack).map;
  const own = ownHomeSlots(game, pack);
  const oldFixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  return Object.entries(game.map).filter(([slot, tile]) => !own.has(slot) && oldFixed.get(slot) !== tile && kept[slot] !== tile).length;
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

/**
 * Slots the player fills by hand, in template order: neither a tile the template fixes (the centre, hyperlanes) nor a
 * seat's home, which the app places itself.
 */
export function freeSlots(game: TableFacts, pack: DataPack): string[] {
  const seats = new Set(seatSlots(game.playerCount, pack, game.layout));
  return slotsFor(game.playerCount, pack, game.layout)
    .filter(slot => !slot.fixed)
    .map(slot => slotKeyOf(slot.q, slot.r))
    .filter(key => !seats.has(key));
}

/** Free slots that still hold no tile: the map is not built while there are any. */
export const emptySlots = (game: TableFacts, pack: DataPack): string[] => freeSlots(game, pack).filter(key => !game.map[key]);

/** The game with the tiles of `from` put back in its free slots that are empty, when the pack still has them. */
export function withPlacedTiles<G extends TableFacts>(game: G, from: TableFacts['map'], pack: DataPack): Mapped<G> {
  const back = freeSlots(game, pack).filter(key => !game.map[key] && from[key] && pack.tiles[from[key].split('@')[0]]);
  if (back.length === 0) return game as Mapped<G>;
  return { ...game, map: { ...game.map, ...Object.fromEntries(back.map(key => [key, from[key]])) } };
}

/** Whether the game is set up to play: every opponent has a faction and every free slot holds a tile. */
export const readyToPlay = (game: TableFacts, pack: DataPack): boolean =>
  game.opponents.every(opponent => opponent.faction !== '') && emptySlots(game, pack).length === 0;
