/**
 * Structures (LRR 85, 24, 63, 79): whose they are, the limits a planet and the reinforcements set, and what happens to
 * them when a planet changes hands. A structure belongs to the player who controls its planet, so each player's state
 * holds only their own; another player gaining the planet destroys them (49.5.1, 63.4, 79.4).
 */
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, StructureKind, Warning } from '../types';
import { planetsOf } from './board';

/** Most of one kind a planet holds (24 notes 1-2, 63.3, 79.3, 85.4, 85.5). */
const PER_PLANET: Record<StructureKind, number> = { spacedock: 1, pds: 2 };

const countOn = (state: GameState, kind: StructureKind, planetId: string): number =>
  (kind === 'pds' ? state.pds[planetId] ?? 0 : state.docks.includes(planetId) ? 1 : 0);

const countAll = (state: GameState, kind: StructureKind): number =>
  (kind === 'pds' ? Object.values(state.pds).reduce((sum, n) => sum + n, 0) : state.docks.length);

/**
 * Effect at the start of a replay: of the game's structures the player of `state` keeps those on their planets; `free`
 * also keeps those on planets no one controls (mine, as the game screen places them).
 */
export function keepOwnStructures(state: GameState, free: boolean): void {
  const own = (planetId: string) => state.control[planetId] === 'me' || (free && state.control[planetId] === undefined);
  state.docks = state.docks.filter(own);
  state.pds = Object.fromEntries(Object.entries(state.pds).filter(([planetId]) => own(planetId)));
}

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
 * Check and effect of the structures a Construction card places (24.2, 24.3): the primary places one PDS or space dock
 * and may add one PDS, the secondary one structure in the system that got its token; each goes on a planet the player
 * controls, within what a planet holds (85.4-85.6) and what the reinforcements hold (24.4). A structure beyond a limit
 * is warned about and still placed where it can be counted: a second dock on a planet stays one.
 */
export function buildStructures(
  game: Game, state: GameState, structures: { kind: StructureKind; planetId: string }[], primary: boolean, systemId: string | undefined,
  pack: DataPack, warnings: Warning[],
): void {
  const docks = structures.filter(s => s.kind === 'spacedock').length;
  if (structures.length > (primary ? 2 : 1) || docks > 1) {
    warnings.push(violation('structureLimit', { kind: docks > 1 ? 'spacedock' : 'pds', count: structures.length }));
  }
  const inSystem = !primary && systemId !== undefined ? planetsOf(game, systemId, pack) : null;
  for (const { kind, planetId } of structures) {
    if (state.control[planetId] !== 'me') warnings.push(violation('structureNotControlled', { planetId }));
    if (inSystem && !inSystem.includes(planetId)) warnings.push(violation('structureOutsideSystem', { planetId, systemId: systemId ?? '' }));
    if (countOn(state, kind, planetId) >= PER_PLANET[kind]) warnings.push(violation('structureLimit', { kind, planetId, count: PER_PLANET[kind] }));
    const limit = pack.structures.find(s => s.id === kind)?.limit ?? null;
    if (limit !== null && countAll(state, kind) >= limit) warnings.push(violation('structureLimit', { kind, count: limit }));
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
}
