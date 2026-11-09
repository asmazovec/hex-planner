/**
 * Neighbours (LRR 60): two players with a unit or a controlled planet in the same system, or in systems adjacent to each
 * other; a wormhole or a hyperlane makes systems adjacent (60.2), as for movement.
 */
import { routeDistances } from './movement';
import { planetsOf, systemSlots } from './replay/board';
import type { DataPack, Game, GameState } from './types';

const holds = (units: Record<string, number | undefined> | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);

/** The systems where a player is present, from their own replayed state: units in space or on a planet, or a planet they control. */
function presence(game: Game, state: GameState, pack: DataPack): Set<string> {
  const slots = new Set<string>();
  for (const slot of systemSlots(game)) {
    if (holds(state.systems[slot])) slots.add(slot);
    if (planetsOf(game, slot, pack).some(id => holds(state.ground[id]) || state.control[id] === 'me')) slots.add(slot);
  }
  return slots;
}

export function areNeighbors(game: Game, a: GameState, b: GameState, pack: DataPack): boolean {
  const theirs = presence(game, b, pack);
  return [...presence(game, a, pack)].some(slot => {
    const steps = routeDistances(game, slot, pack);
    return [...theirs].some(other => (steps.get(other) ?? Infinity) <= 1);
  });
}
