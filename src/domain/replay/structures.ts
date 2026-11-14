/**
 * Structures (LRR 85, 24, 63, 79): whose they are, the limits a planet and the reinforcements set, and what happens to
 * them when a planet changes hands. A structure belongs to the player who controls its planet, so each player's state
 * holds only their own; another player gaining the planet destroys them (49.5.1, 63.4, 79.4).
 */
import { violation } from '../rules/registry';
import type { GameState, StructureCounts, StructureKind, Warning } from '../types';

/** Most of one kind a planet holds (24 notes 1-2, 63.3, 79.3, 85.4, 85.5). */
export const PER_PLANET: Record<StructureKind, number> = { spacedock: 1, pds: 2 };

export const countOn = (state: GameState, kind: StructureKind, planetId: string): number =>
  (kind === 'pds' ? state.pds[planetId] ?? 0 : state.docks.includes(planetId) ? 1 : 0);

/** Effect: another player gains a planet; the player of `state` loses it if it was theirs, and their structures on it are destroyed. */
export function losePlanet(state: GameState, planetId: string): void {
  state.control[planetId] = 'enemy';
  state.docks = state.docks.filter(id => id !== planetId);
  delete state.pds[planetId];
}

/** Whose structure of a kind stands on a planet in the state shown: 'me', an opponent id, or undefined for none. */
export function structureOwner(state: GameState, kind: StructureKind, planetId: string): string | undefined {
  if (countOn(state, kind, planetId) > 0) return 'me';
  return Object.entries(state.rivals ?? {}).find(([, rival]) => countOn(rival, kind, planetId) > 0)?.[0];
}

/** The structures standing on a planet, each with its owner: mine, then each opponent's. */
export function structuresOn(state: GameState, planetId: string): { kind: StructureKind; owner: string; count: number }[] {
  const holders: [string, GameState][] = [['me', state], ...Object.entries(state.rivals ?? {})];
  return holders.flatMap(([owner, held]) => (['pds', 'spacedock'] as const)
    .map(kind => ({ kind, owner, count: countOn(held, kind, planetId) }))
    .filter(s => s.count > 0));
}

/**
 * What the board itself breaks on these planets, apart from any entry: more PDS on a planet than it holds (63.3, 85.5),
 * counting each player's. A placement by hand in the big hex is checked by this.
 */
export function planetStructureWarnings(state: GameState, planetIds: string[]): Warning[] {
  const holders = [state, ...Object.values(state.rivals ?? {})];
  return planetIds.flatMap(planetId => holders.some(held => countOn(held, 'pds', planetId) > PER_PLANET.pds)
    ? [violation('structureLimit', { kind: 'pds', planetId, count: PER_PLANET.pds, context: 'planet' }, 'production')]
    : []);
}

const KINDS: StructureKind[] = ['pds', 'spacedock'];
export const kindsOf = (structures: StructureCounts | undefined): StructureKind[] => KINDS.filter(kind => (structures?.[kind] ?? 0) > 0);
