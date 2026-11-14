import { type Link, routeDistances } from '../../../domain/movement';
import { planetsOf, systemSlots } from '../../../domain/replay/board';
import type { DataPack } from '../../../domain/types';
import type { Game } from './types';
import type { GameState } from './types';
import { areNeighborsOf, holds } from '../../../domain/neighbors';
/** Whether a player is present in a system or next to it: units there, or a planet of theirs. */
export function presentNear(game: Game, state: GameState, slot: string, pack: DataPack, links?: readonly Link[]): boolean {
  const steps = routeDistances(game, slot, pack, links);
  return [...presence(game, state, pack)].some(here => (steps.get(here) ?? Infinity) <= 1);
}

/** The systems where a player is present, from their own replayed state: units in space or on a planet, or a planet they control. */
export function presence(game: Game, state: GameState, pack: DataPack): Set<string> {
  const slots = new Set<string>();
  for (const slot of systemSlots(game)) {
    if (holds(state.systems[slot])) slots.add(slot);
    if (planetsOf(game, slot, pack).some(id => holds(state.ground[id]) || state.control[id] === 'me')) slots.add(slot);
  }
  return slots;
}

/** `links` are the systems made adjacent beyond the board (wormhole tokens, a law, an ability: `linksOf` in movement.ts). */
export function areNeighbors(game: Game, a: GameState, b: GameState, pack: DataPack, links?: readonly Link[]): boolean {
  return areNeighborsOf(game, presence(game, a, pack), presence(game, b, pack), pack, links);
}
