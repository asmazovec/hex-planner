import type { Game, PlanetDef, DataPack, UnitId, StructureKind, UnitCounts } from '../../../domain/types';
import type { GameState } from './types';
import { planetHolder } from '../../../domain/players';
import { type SpaceStack, type GroundStack, UNIT_ORDER } from '../../../domain/hexLayout';
import { unitsOf } from '../../../domain/stacks';
import { opponentsBySeat } from './players';
import { systemSlots, planetsOf, tileAt } from '../../../domain/replay/board';
import { startingPds, startingDocks } from '../../../domain/strategy';
import { structuresOn } from './replay/structures';

/** A player's own state in a whole board: mine, or an opponent's as the replay counts them. */
export const playerState = (board: GameState, owner: string | undefined): GameState =>
  (owner && owner !== 'me' && board.rivals?.[owner]) || board;
/** The opponent an enemy planet belongs to in a state: who took it in the plan, else its owner on the map; undefined when it is not an enemy's. */
export const holderIn = (game: Pick<Game, 'opponents' | 'planetOwner'>, state: Pick<GameState, 'control' | 'rivalHolds'>, planetId: string): string | undefined =>
  (state.control[planetId] === 'enemy' ? state.rivalHolds?.[planetId] ?? planetHolder(game, planetId) : undefined);
/**
 * The stacks of a system, as a tile draws them: mine, then each opponent's by seat (as the replay moved them, or as they
 * stand on the map without one), then the ground forces and structures on the planets. An opponent's ground forces still
 * listed with the system stand on its first planet, or on the comb of a system without planets.
 */
export function stacksOf(game: Game, state: GameState, slot: string, planets: PlanetDef[], pack: DataPack): { space: SpaceStack[]; ground: GroundStack[] } {
  const space: SpaceStack[] = [];
  const ground: GroundStack[] = [];
  const isGround = (unit: UnitId) => pack.units[unit]?.ground ?? (unit === 'infantry' || unit === 'mech');
  const groundKinds = UNIT_ORDER.filter(isGround);
  for (const { unit, count } of unitsOf(state.systems[slot])) space.push({ kind: unit, owner: 'me', count });
  for (const { id: owner } of opponentsBySeat(game)) {
    const rival = state.rivals?.[owner];
    const left = (rival ? rival.systems[slot] : game.enemyUnits[slot]?.[owner]) ?? {};
    for (const { unit, count } of unitsOf(left)) if (!isGround(unit)) space.push({ kind: unit, owner, count });
    for (const unit of groundKinds) {
      if (planets.length === 0 && left[unit]) ground.push({ kind: unit, owner, count: left[unit], planet: 0 });
      planets.forEach((planet, i) => {
        const count = ((rival ? rival.ground[planet.id] : game.enemyGround[planet.id]?.[owner])?.[unit] ?? 0) + (i === 0 ? left[unit] ?? 0 : 0);
        if (count > 0) ground.push({ kind: unit, owner, count, planet: i });
      });
    }
  }
  planets.forEach((planet, i) => {
    for (const { unit, count } of unitsOf(state.ground[planet.id])) ground.push({ kind: unit, owner: 'me', count, planet: i });
    for (const { kind, owner, count } of structuresOn(state, planet.id)) ground.push({ kind, owner, count, planet: i });
  });
  return { space, ground };
}
/**
 * The ground forces of everyone but the player whose view `game` is, on a planet of a whole board (`board.rivals`
 * holds the opponents): mine are under `me`. Without a replay of opponents, what stands on the map.
 */
export function othersOnPlanet(game: Game, board: GameState | undefined, planetId: string): { owner: string; unit: UnitId; count: number }[] {
  return opponentsBySeat(game).flatMap(o => {
    const units = !board?.rivals ? game.enemyGround[planetId]?.[o.id] : o.id === 'me' ? board.ground[planetId] : board.rivals[o.id]?.ground[planetId];
    return unitsOf(units).map(({ unit, count }) => ({ owner: o.id, unit, count }));
  });
}
/** The slot of the system a planet lies in, on this game's map; none for a planet that is not on it. */
export const systemOfPlanet = (game: Game, planetId: string, pack: DataPack): string | undefined =>
  systemSlots(game).find(slot => planetsOf(game, slot, pack).includes(planetId));
/** Whether a planet lies in a home system (a tile of the kind `home`). */
export function inHomeSystem(game: Game, planetId: string, pack: DataPack): boolean {
  const slot = systemOfPlanet(game, planetId, pack);
  return slot !== undefined && tileAt(game, slot, pack)?.kind === 'home';
}
/** Whether the game itself holds a structure, apart from what entries plan: a PDS set on the map, or a dock of the start. */
export const structureInGame = (game: Game, pack: DataPack, kind: StructureKind, planetId: string): boolean =>
  (kind === 'pds' ? (startingPds(game, pack)[planetId] ?? 0) > 0 : startingDocks(game, pack).includes(planetId));
/**
 * One unit of an opponent set by hand, added or removed. Ground forces go by planet; a removed one still listed with the
 * system (as a start places them) comes off there. Returns the stack to write: on a planet, or in the system's space.
 */
export function enemyChange(
  game: Game, slot: string, owner: string, unit: UnitId, planetId: string | null, amount: number,
): { planetId: string; units: UnitCounts } | { slot: string; units: UnitCounts } {
  const shifted = (units: UnitCounts): UnitCounts => {
    const count = (units[unit] ?? 0) + amount;
    const { [unit]: gone, ...rest } = units;
    void gone;
    return count > 0 ? { ...rest, [unit]: count } : rest;
  };
  const onPlanet = planetId === null ? {} : game.enemyGround[planetId]?.[owner] ?? {};
  if (planetId !== null && (amount > 0 || (onPlanet[unit] ?? 0) > 0)) return { planetId, units: shifted(onPlanet) };
  return { slot, units: shifted(game.enemyUnits[slot]?.[owner] ?? {}) };
}
