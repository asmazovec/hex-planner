import { seatSlots, slotsFor } from './mapBuilder';
import { slotKeyOf } from './newGame';
import type { DataPack } from './types';

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

export interface MapStringResult {
  /** Slot key to tile (`<id>` or `<id>@<rotation>`); the centre and empty slots are absent. */
  map: Record<string, string>;
  /** Tokens that name no tile of the data pack. */
  unknown: string[];
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
}

/**
 * Reads a Milty Draft map string: tiles of rings 1 to 4 in order, from the top of each ring clockwise, separated by
 * spaces. `0` is an empty slot or a home placeholder, a hyperlane is its id with a rotation digit (`83A3`), and the
 * centre is absent (a braced `{18}` is skipped). Home system ids are placed like any tile. Slots outside the template
 * of the player count are not filled and are counted in `dropped`.
 */
export function parseMapString(text: string, playerCount: number, pack: DataPack): MapStringResult {
  const template = new Set(slotsFor(playerCount, pack).map(s => slotKeyOf(s.q, s.r)));
  const seats = seatSlots(playerCount, pack).length;
  const slots = Array.from({ length: RINGS }, (_, i) => ringSlots(i + 1)).flat();
  const tokens = text.split(/[\s,]+/).filter(token => token !== '' && !/^\{.*\}$/.test(token));

  const map: Record<string, string> = {};
  const unknown: string[] = [];
  let dropped = 0;
  let homes = 0;
  tokens.slice(0, slots.length).forEach((raw, index) => {
    const token = raw.toUpperCase();
    if (token === '0' || token === '-1') return;
    const lane = HYPERLANE.exec(token);
    const tile = lane ? `${lane[1]}@${lane[2]}` : token;
    const def = pack.tiles[tile.split('@')[0]];
    if (!def) {
      unknown.push(raw);
    } else if (!template.has(slots[index])) {
      dropped += 1;
    } else {
      map[slots[index]] = tile;
      if (def.kind === 'home') homes += 1;
    }
  });
  const expected = template.size === 0 ? 0 : template.size - 1 - seats;
  return { map, unknown, expected, found: Object.keys(map).length - homes, homes, dropped, tokens: tokens.length };
}
