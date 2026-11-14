/**
 * Neighbours (LRR 60): two players with a unit or a controlled planet in the same system, or in systems adjacent to each
 * other; a wormhole or a hyperlane makes systems adjacent (60.2), as for movement.
 */
import { routeDistances, type Link } from './movement';
import { type MapSource } from './replay/board';
import type { DataPack } from './types';

export const holds = (units: Record<string, number | undefined> | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);

/** The same over the systems each of the two is present in. */
export function areNeighborsOf(game: MapSource, mine: ReadonlySet<string>, theirs: ReadonlySet<string>, pack: DataPack, links?: readonly Link[]): boolean {
  return [...mine].some(slot => {
    const steps = routeDistances(game, slot, pack, links);
    return [...theirs].some(other => (steps.get(other) ?? Infinity) <= 1);
  });
}
