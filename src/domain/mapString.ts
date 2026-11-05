import { templateFor, templateOf } from './layouts';
import { seatSlots } from './mapBuilder';
import { slotKeyOf } from './newGame';
import type { DataPack, ExpansionId, MapLayout, TileDef } from './types';

/** Axial steps of the ring walk: east, south-east, south-west, west, north-west, north-east. */
const STEPS: [number, number][] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

/** Rings Milty Draft writes: its string always covers rings 1 to 4. */
const RINGS = 4;

/** Slot keys of one ring, starting at the top and going clockwise. */
export function ringSlots(ring: number): string[] {
  const keys: string[] = [];
  let q = 0;
  let r = -ring;
  for (const [dq, dr] of STEPS) {
    for (let i = 0; i < ring; i += 1) {
      keys.push(slotKeyOf(q, r));
      q += dq;
      r += dr;
    }
  }
  return keys;
}

const HYPERLANE = /^(\d+[AB])([0-5])$/;

/** Tokens Milty writes: rings 1 to 4. */
export const MILTY_TOKENS = 60;

/** Fewest tiles that make a sorted list a set of tiles rather than a map. */
const SET_MIN = 10;
/** Mecatol Rex and its Thunder's Edge version. */
const MECATOL_PLANETS = ['mr', 'mrte'];

/** Packs of single expansions, to tell a tile of an expansion that is off from a tile nobody knows. */
export type OtherPacks = Partial<Record<ExpansionId, DataPack>>;

export interface MapStringResult {
  /** Slot key to tile (`<id>` or `<id>@<rotation>`); the centre and empty slots are absent. */
  map: Record<string, string>;
  /** Tokens that name no tile of the data pack. */
  unknown: string[];
  /** The layout whose template the string was read against: with hyperlanes if the string has any, else standard. */
  layout: MapLayout;
  /** Slots the template fills with something other than a home system or the centre. */
  expected: number;
  /** Tiles placed, home systems not counted. */
  found: number;
  /** Home system tiles placed. */
  homes: number;
  /** Known tiles whose slot the template of this player count does not have. */
  dropped: number;
  /** Tokens read, braced centre excluded; Milty writes 60. */
  tokens: number;
  /** `map` is a string with positions. `set` is a sorted list of tiles with none: see `arrangeSet`. */
  kind: 'map' | 'set';
  /** Known tiles of the string that the pack can place, for `arrangeSet`; filled when `kind` is `set`. */
  set: string[];
  /** Tiles that belong to an expansion that is off, by expansion; they are not in `unknown`. */
  offExpansion: Partial<Record<ExpansionId, string[]>>;
  /** The token count is a whole number of rings that covers the template, or the 60 Milty writes. */
  tokensComplete: boolean;
}

const isMecatol = (def: TileDef | undefined): boolean => def !== undefined && def.planetIds.some(id => MECATOL_PLANETS.includes(id));

/** Rings of a template, from the farthest slot. */
const radiusOf = (slots: { q: number; r: number }[]): number =>
  slots.reduce((far, { q, r }) => Math.max(far, Math.abs(q), Math.abs(r), Math.abs(q + r)), 0);

/**
 * Reads a Milty Draft map string: tiles of rings 1 to 4 in order, from the top of each ring clockwise, separated by
 * spaces. `0` is an empty slot or a home placeholder, a hyperlane is its id with a rotation digit (`83A3`), and the
 * centre is absent (a braced `{18}` is skipped). Home system ids are placed like any tile. Slots outside the template
 * of the player count are not filled and are counted in `dropped`. A string with hyperlanes is read against the
 * hyperlane layout of the player count, one without against the standard layout; the other layout is used when the
 * pack lacks the one wanted. A plain `18` (or a Mecatol `112`) is skipped like a braced one. Tiles of an expansion that is
 * off, found through `others`, are listed in `offExpansion` instead of `unknown`. Tokens that are strictly ascending, at
 * least ten of them, are a tile set without positions (`kind: set`), which `arrangeSet` lays out.
 */
export function parseMapString(text: string, playerCount: number, pack: DataPack, others: OtherPacks = {}): MapStringResult {
  const defOf = (token: string): TileDef | undefined =>
    pack.tiles[token] ?? Object.values(others).map(other => other.tiles[token]).find(def => def !== undefined);
  // A plain Mecatol Rex is never a ring slot, whatever its position.
  const tokens = text.split(/[\s,]+/)
    .filter(token => token !== '' && !/^\{.*\}$/.test(token) && !isMecatol(defOf(token.toUpperCase())));
  const wanted: MapLayout = tokens.some(token => HYPERLANE.test(token.toUpperCase())) ? 'hyperlanes' : 'standard';
  const chosen = templateFor(playerCount, wanted, pack) ?? templateOf(playerCount, pack);
  const layout = chosen?.layout ?? 'standard';
  const template = new Set((chosen?.slots ?? []).map(s => slotKeyOf(s.q, s.r)));
  const seats = seatSlots(playerCount, pack, layout).filter(key => template.has(key)).length;
  const slots = Array.from({ length: RINGS }, (_, i) => ringSlots(i + 1)).flat();

  const map: Record<string, string> = {};
  const unknown: string[] = [];
  const offExpansion: MapStringResult['offExpansion'] = {};
  let dropped = 0;
  let homes = 0;
  tokens.slice(0, slots.length).forEach((raw, index) => {
    const token = raw.toUpperCase();
    if (token === '0' || token === '-1') return;
    const lane = HYPERLANE.exec(token);
    const tile = lane ? `${lane[1]}@${lane[2]}` : token;
    const def = pack.tiles[tile.split('@')[0]];
    if (!def) {
      const owner = (Object.keys(others) as ExpansionId[]).find(id => others[id]?.tiles[tile.split('@')[0]]);
      if (owner) offExpansion[owner] = [...(offExpansion[owner] ?? []), raw];
      else unknown.push(raw);
    } else if (!template.has(slots[index])) {
      dropped += 1;
    } else {
      map[slots[index]] = tile;
      if (def.kind === 'home') homes += 1;
    }
  });
  const expected = template.size === 0 ? 0 : template.size - 1 - seats;
  const ring = radiusOf(chosen?.slots ?? []);
  const numbers = tokens.filter(token => token !== '0' && token !== '-1').map(token => (/^\d+$/.test(token) ? Number(token) : NaN));
  const sorted = numbers.length >= SET_MIN && numbers.every((n, i) => !Number.isNaN(n) && (i === 0 || n > numbers[i - 1]));
  const known = sorted ? tokens.filter(token => pack.tiles[token.toUpperCase()]).map(token => token.toUpperCase()) : [];
  return {
    map: sorted ? {} : map, unknown, layout, expected, found: sorted ? 0 : Object.keys(map).length - homes, homes: sorted ? 0 : homes,
    dropped: sorted ? 0 : dropped, tokens: tokens.length, kind: sorted ? 'set' : 'map', set: known, offExpansion,
    tokensComplete: tokens.length === MILTY_TOKENS || tokens.length === 3 * ring * (ring + 1),
  };
}

/**
 * Lays out a sorted list of tiles that has no positions: home systems go to the seats in seat order, every other tile
 * fills the free slots in ring order, and the centre gets the template's Mecatol Rex. Tiles beyond the free slots
 * are counted in `dropped`; a home system left over is an ordinary tile.
 */
export function arrangeSet(tiles: string[], playerCount: number, pack: DataPack, layout: MapLayout = 'standard'): MapStringResult {
  const chosen = templateFor(playerCount, layout, pack) ?? templateOf(playerCount, pack);
  const slots = chosen?.slots ?? [];
  const fixed = new Map(slots.map(slot => [slotKeyOf(slot.q, slot.r), slot.fixed]));
  const seats = seatSlots(playerCount, pack, chosen?.layout ?? layout).filter(key => fixed.has(key));
  const isHome = (id: string) => pack.tiles[id]?.kind === 'home';
  const homes = tiles.filter(isHome);
  const map: Record<string, string> = {};
  seats.forEach((key, i) => { if (i < homes.length) map[key] = homes[i]; });
  const free = [1, 2, 3, 4].flatMap(ringSlots).filter(key => fixed.has(key) && !fixed.get(key) && !seats.includes(key));
  const rest = [...tiles.filter(id => !isHome(id)), ...homes.slice(seats.length)];
  let dropped = 0;
  rest.forEach((id, i) => { if (i < free.length) map[free[i]] = id; else dropped += 1; });
  const centre = fixed.get('0,0');
  if (centre) map['0,0'] = centre;
  const placedHomes = Math.min(homes.length, seats.length);
  const template = new Set(fixed.keys());
  return {
    map, unknown: [], layout: chosen?.layout ?? layout, expected: template.size === 0 ? 0 : template.size - 1 - seats.length,
    found: Object.keys(map).length - placedHomes - (centre ? 1 : 0), homes: placedHomes, dropped, tokens: tiles.length,
    kind: 'map', set: [], offExpansion: {}, tokensComplete: true,
  };
}
