/**
 * Neighbours (LRR 60): two players with a unit or a controlled planet in the same system, or in systems adjacent to each
 * other; a wormhole or a hyperlane makes systems adjacent (60.2), as for movement.
 */
import { routeDistances, type Link } from './movement';
import { planetsOf, systemSlots, type MapSource } from './replay/board';
import type { DataPack, Game, GameState } from './types';

const holds = (units: Record<string, number | undefined> | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);

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

/** The same over the systems each of the two is present in. */
export function areNeighborsOf(game: MapSource, mine: ReadonlySet<string>, theirs: ReadonlySet<string>, pack: DataPack, links?: readonly Link[]): boolean {
  return [...mine].some(slot => {
    const steps = routeDistances(game, slot, pack, links);
    return [...theirs].some(other => (steps.get(other) ?? Infinity) <= 1);
  });
}

/** Whether a player is present in a system or next to it: units there, or a planet of theirs. */
export function presentNear(game: Game, state: GameState, slot: string, pack: DataPack, links?: readonly Link[]): boolean {
  const steps = routeDistances(game, slot, pack, links);
  return [...presence(game, state, pack)].some(here => (steps.get(here) ?? Infinity) <= 1);
}
