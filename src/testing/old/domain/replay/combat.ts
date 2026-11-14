import type { Game, GameState, DataPack, Warning } from '../../../../domain/types';
import { unitIds, type TacticalEntry } from '../../../../domain/replay/state';
import { planetsOf } from '../../../../domain/replay/board';
import { checkArrivalOf, stacksOfState } from '../../../../domain/replay/transport';

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
