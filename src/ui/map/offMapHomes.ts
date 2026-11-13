import { slotsFor } from '../../domain/mapBuilder';
import { slotKeyOf } from '../../domain/newGame';
import { parseSlot } from '../../domain/route';
import { offMapHomes } from '../../domain/strategy';
import type { DataPack, Game } from '../../domain/types';
import { HEX_SIZE, hexToPixel, placeOffMapHomes, type Point } from './geometry';

/** Between the centres of the outermost ring and an off-map home: a hex across and a little air. */
const OFF_MAP_REACH = HEX_SIZE * Math.sqrt(3) + 14;

/**
 * Where each off-map home (the Creuss home, LRR 6 note 2) is drawn: beside the map, one hex beyond its outermost ring,
 * on the bearing of the gate it is joined to.
 */
export function offMapSpots(game: Game, pack: DataPack): Record<string, Point> {
  const homes = offMapHomes(game, pack);
  if (homes.length === 0) return {};
  const keys = new Set(slotsFor(game.playerCount, pack, game.layout).map(s => slotKeyOf(s.q, s.r)));
  for (const key of Object.keys(game.map)) keys.add(key);
  const radius = Math.max(...[...keys].flatMap(key => {
    const at = parseSlot(key);
    return at ? [Math.hypot(hexToPixel(at.q, at.r).x, hexToPixel(at.q, at.r).y)] : [];
  }));
  const spots: Record<string, Point> = {};
  homes.forEach((home, n) => {
    const gate = Object.keys(game.map).find(slot => {
      const id = game.map[slot].split('@')[0];
      return Object.values(pack.factions).some(f => f.homeTile === home && f.gateTile === id);
    });
    const at = gate ? parseSlot(gate) : null;
    const from = at ? hexToPixel(at.q, at.r) : { x: 0, y: 0 };
    const length = Math.hypot(from.x, from.y);
    // A gate in the middle (or none) sends the home to the side, one after the other.
    const dir = length > 1 ? { x: from.x / length, y: from.y / length } : { x: 1, y: n };
    const unit = Math.hypot(dir.x, dir.y);
    const reach = radius + OFF_MAP_REACH;
    spots[home] = { x: (dir.x / unit) * reach, y: (dir.y / unit) * reach };
  });
  return spots;
}

/** Tells the drawing where the off-map homes of this game stand; the same game always puts them in the same places. */
export function placeOffMap(game: Game, pack: DataPack): Record<string, Point> {
  const spots = offMapSpots(game, pack);
  placeOffMapHomes(spots);
  return spots;
}
