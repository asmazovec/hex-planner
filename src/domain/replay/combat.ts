/** Step 89.3 Combat: the units lost in space and on the planets are removed, and what the surviving ships carry is checked. */
import { holderOf } from '../effects/registry';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, Warning } from '../types';
import { planetsOf } from './board';
import { take, unitIds, type TacticalEntry } from './state';
import { capacity, checkArrivalOf, dockFighterRoom, stacksOfState } from './transport';

/**
 * Whether anything can destroy ships in the active system once they arrived: another player's ships (a space combat),
 * or planets (space cannon). Losses where nothing can were taken on the way, in a gravity rift (37 note 4).
 */
export function canFight(game: Game, state: GameState, target: string, pack: DataPack): boolean {
  const ships = (units: Game['enemyUnits'][string][string] | undefined) => unitIds(units ?? {}).some(id => !pack.units[id]?.ground);
  return planetsOf(game, target, pack).length > 0
    || Object.values(game.enemyUnits[target] ?? {}).some(ships)
    || Object.values(state.rivals ?? {}).some(rival => ships(rival.systems[target]));
}

/**
 * Check on arrival, before the battle (37.3, 76.2): the ships in the active system against the fleet pool, so a battle
 * that later destroys the excess does not undo it. The ground forces this action lands count as landed already, so the
 * fighters they make room for are no ships.
 */
export const checkArrival = (game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack): Warning[] =>
  checkArrivalOf(stacksOfState(game, state, pack), target, entry.landings.filter(landing => landing.from === undefined).map(landing => landing.units), pack);

/** Effect: ships lost in the space combat leave the active system; a loss of what is not there is reported. */
export function removeLosses(state: GameState, target: string, entry: TacticalEntry, warnings: Warning[]): void {
  if (entry.losses) take(state.systems, target, entry.losses, warnings, 'combat');
}

/**
 * Check at the end of the space combat (16.3.3, 78.10.1): the fighters and ground forces in the active system beyond
 * the capacity of the ships left. Only after a battle that cost something: without losses the capacity is what it was
 * on arrival. The player removes the excess by hand (16.3.1), so nothing is removed here; what they still land is
 * warned about with it.
 */
export function checkAfterCombat(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack): Warning[] {
  if (unitIds(entry.losses ?? {}).length === 0) return [];
  const left = capacity(game, state.systems[target] ?? {}, holderOf(game, state), pack, dockFighterRoom(game, state, target, pack));
  return left.load > left.capacity ? [violation('capacitySystem', { systemId: target, load: left.load, capacity: left.capacity }, 'combat')] : [];
}

/** Effect: ground forces lost on the planets, after the landing. */
export function removeGroundLosses(state: GameState, entry: TacticalEntry, warnings: Warning[]): void {
  for (const [planetId, units] of Object.entries(entry.groundLosses ?? {})) take(state.ground, planetId, units, warnings, 'combat');
}
