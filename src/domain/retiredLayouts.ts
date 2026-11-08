import { moveToTemplate, seatSlots, templateFor } from './mapBuilder';
import { withSlotsMoved } from './slotRename';
import type { DataPack, Game } from './types';

/**
 * Homes of the seven-player map without hyperlanes that the app had before the rulebook's maps: four full rings with
 * Milty Draft's seven-player homes. The rules have no such map, so it is gone.
 */
export const RETIRED_SEVEN_HOMES = ['0,-4', '3,-3', '3,0', '0,4', '-3,4', '-4,2', '-3,-1'];

/**
 * A seven-player game saved on the retired map without hyperlanes moves to the rulebook's seven-player map. A seat
 * whose home lies elsewhere there, with the player's own home tile on the old slot, trades slots with its new home: the
 * tiles of the two slots and what the game says about them (enemy units, plans) swap. Then the map moves as
 * `moveToTemplate` moves it, so the hyperlanes displace what stands under them. Any other game, or a pack without that
 * map, comes back as it is.
 */
export function withoutRetiredLayout(game: Game, pack: DataPack): Game {
  const next = templateFor(7, 'hyperlanes', pack);
  if (game.playerCount !== 7 || game.layout !== 'standard' || !next) return game;
  const homes = seatSlots(7, pack, 'hyperlanes');
  const swap = new Map<string, string>();
  for (const { faction, seat } of [game, ...game.opponents]) {
    const old = RETIRED_SEVEN_HOMES[seat - 1];
    const now = homes[seat - 1];
    const def = pack.factions[faction];
    // Only a seat whose own home stands there moves.
    if (!old || !now || !def || game.map[old]?.split('@')[0] !== (def.gateTile ?? def.homeTile)) continue;
    if (now === old || swap.has(old) || swap.has(now)) continue;
    swap.set(old, now);
    swap.set(now, old);
  }
  const to = (slot: string): string => swap.get(slot) ?? slot;
  const map = Object.fromEntries(Object.entries(game.map).map(([slot, tile]) => [to(slot), tile]));
  // The retired map had the same four rings, with nothing fixed but the centre.
  const oldSlots = next.slots.map(slot => (slot.q === 0 && slot.r === 0 ? slot : { q: slot.q, r: slot.r }));
  return { ...withSlotsMoved(game, to), layout: 'hyperlanes', map: moveToTemplate(map, oldSlots, next, pack) };
}
