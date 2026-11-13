/**
 * Gaining a breakthrough (Thunder's Edge): the card becomes the player's, and what it does "when you gain this card"
 * runs. The one place for every way it comes: an entry's `gains`, the Quantumcore, an expedition.
 */
import { componentById } from '../components';
import type { DataPack } from '../types';
import { effectOf } from './registry';
import type { EffectTurn } from './types';

/** The id of the breakthrough on the faction's sheet, when the pack has it (it needs Thunder's Edge); the Keleres share one. */
export function breakthroughOf(pack: DataPack, faction: string): string | undefined {
  const sheet = pack.factions[faction]?.sheet?.breakthrough;
  const id = sheet ? `breakthrough:${sheet.id}` : undefined;
  return id !== undefined && componentById(pack, id) !== undefined ? id : undefined;
}

/**
 * The player gains their faction's breakthrough, if they do not have it: it is held and its `gained` hook runs. The
 * `turn` is the gain's, its `id` being replaced by the breakthrough's. Returns whether the card was gained now.
 */
export function gainBreakthrough(turn: EffectTurn): boolean {
  const id = breakthroughOf(turn.pack, turn.game.faction);
  if (id === undefined || turn.state.holdings.breakthrough !== undefined) return false;
  turn.state.holdings.breakthrough = 'held';
  effectOf(turn.pack, id)?.gained?.({ ...turn, id });
  return true;
}
