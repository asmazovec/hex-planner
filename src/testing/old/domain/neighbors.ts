import type { Game, GameState, DataPack } from '../../../domain/types';
import { type Link, routeDistances } from '../../../domain/movement';
import { presence } from '../../../domain/neighbors';

/** Whether a player is present in a system or next to it: units there, or a planet of theirs. */
export function presentNear(game: Game, state: GameState, slot: string, pack: DataPack, links?: readonly Link[]): boolean {
  const steps = routeDistances(game, slot, pack, links);
  return [...presence(game, state, pack)].some(here => (steps.get(here) ?? Infinity) <= 1);
}
