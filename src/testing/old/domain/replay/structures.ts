import type { StructureKind, Warning, DataPack } from '../../../../domain/types';
import type { Game } from '../types';
import type { GameState } from '../types';
import { violation } from '../../../../domain/rules/registry';
import { PER_PLANET, kindsOf } from '../../../../domain/replay/structures';
import { planetsOf, sourceSlot } from '../../../../domain/replay/board';
import type { TacticalEntry } from '../../../../domain/replay/state';
import structureAboard from '../../../../domain/rules/codes/structureAboard';
export const countAll = (state: GameState, kind: StructureKind): number =>
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
/** Takes up to `count` structures of a kind from a planet, or from the space area of a system; returns how many were there to take. */
export function takeStructures(state: GameState, from: string, onPlanet: boolean, kind: StructureKind, count: number): number {
  if (!onPlanet) {
    const here = state.afloat?.[from];
    const got = Math.min(count, here?.[kind] ?? 0);
    if (here && got > 0) {
      if ((here[kind] ?? 0) > got) here[kind] = (here[kind] ?? 0) - got;
      else delete here[kind];
      if (kindsOf(here).length === 0) delete state.afloat![from];
    }
    return got;
  }
  const got = Math.min(count, countOn(state, kind, from));
  if (got > 0 && kind === 'pds') {
    if (state.pds[from] > got) state.pds[from] -= got;
    else delete state.pds[from];
  } else if (got > 0) state.docks = state.docks.filter(id => id !== from);
  return got;
}
/**
 * Check and effect of the structures a flight takes on board (`moves[].structures`), with its units: structures
 * cannot move or be transported (85.3), so each place they are taken from is warned about; a component may lift that.
 * What was entered flies all the same: the structures leave their planet (or the space area they stood in) for the
 * space area of the active system, and one that is not there is reported as any missing unit. They take no place on
 * board: capacity counts fighters and ground forces only (16.1).
 */
export function carryStructures(game: Game, state: GameState, target: string, moves: TacticalEntry['moves'], pack: DataPack, warnings: Warning[]): void {
  for (const move of moves) {
    const onPlanet = move.from in pack.planets;
    const source = move.pickupOf ?? sourceSlot(game, pack, move.from) ?? move.from;
    for (const kind of kindsOf(move.structures)) {
      const count = move.structures?.[kind] ?? 0;
      warnings.push(violation(structureAboard.code, { from: source, ...(onPlanet ? { planetId: move.from } : {}), unit: kind, count }));
      const got = takeStructures(state, move.from, onPlanet, kind, count);
      if (got < count) warnings.push(violation('unitsMissing', { where: move.from, unit: kind, missing: count - got }, 'transport'));
      const here = ((state.afloat ??= {})[target] ??= {});
      here[kind] = (here[kind] ?? 0) + count;
    }
  }
}
/**
 * Check and effect of the structures an action puts on planets from the space area of its system
 * (`landings[].structures`), at its end: only onto a planet of that system the player controls by then, and within
 * what a planet holds (85.4, 85.5). What was entered is placed; a second dock on a planet stays one.
 */
export function placeCarried(game: Game, state: GameState, target: string, landings: TacticalEntry['landings'], pack: DataPack, warnings: Warning[]): void {
  const planets = planetsOf(game, target, pack);
  for (const landing of landings) {
    const kinds = kindsOf(landing.structures);
    if (kinds.length === 0) continue;
    if (!planets.includes(landing.planetId)) {
      warnings.push(violation('landingOutsideSystem', { planetId: landing.planetId, systemId: target }));
      continue;
    }
    if (state.control[landing.planetId] !== 'me') warnings.push(violation('structureNotControlled', { planetId: landing.planetId }, 'invasion'));
    for (const kind of kinds) {
      const count = landing.structures?.[kind] ?? 0;
      const got = takeStructures(state, target, false, kind, count);
      if (got < count) warnings.push(violation('unitsMissing', { where: target, unit: kind, missing: count - got, planetId: landing.planetId }, 'invasion'));
      if (countOn(state, kind, landing.planetId) + count > PER_PLANET[kind]) {
        warnings.push(violation('structureLimit', { kind, planetId: landing.planetId, count: PER_PLANET[kind] }, 'invasion'));
      }
      if (kind === 'pds') state.pds[landing.planetId] = (state.pds[landing.planetId] ?? 0) + count;
      else if (!state.docks.includes(landing.planetId)) state.docks.push(landing.planetId);
    }
  }
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

export const countOn = (state: GameState, kind: StructureKind, planetId: string): number =>
  (kind === 'pds' ? state.pds[planetId] ?? 0 : state.docks.includes(planetId) ? 1 : 0);

/** Effect: another player gains a planet; the player of `state` loses it if it was theirs, and their structures on it are destroyed. */
export function losePlanet(state: GameState, planetId: string): void {
  state.control[planetId] = 'enemy';
  state.docks = state.docks.filter(id => id !== planetId);
  delete state.pds[planetId];
}
