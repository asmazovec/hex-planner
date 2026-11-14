import type { DataPack, Entry, Game, GameState, UnitCounts, RuleStep, Warning } from '../../../../domain/types';
import { groundOf, productionDueOn, type ProductionSource, type Producer, producersOn, producerPlanets, placesOf, checkProductionOn, costOn } from '../../../../domain/replay/production';
import { add, type TacticalEntry } from '../../../../domain/replay/state';
import { pay } from './payment';
import { violation } from '../../../../domain/rules/registry';
/**
 * Everything of mine that produces in a system, in the order docks, PDS, units, planets, space (the first dock is where
 * ground forces go with no choice). My space docks on planets I control, since an opponent's dock gives me nothing
 * (79.4); then what components make a producer through the points `productionValue` (a PDS, base 0), `unitProduction`,
 * `planetProduction` and `spaceProduction` (a value above 0). Units in an entropic scar cannot use Production
 * (Thunder's Edge, entropic scars 2), so there are none. With `homeDock` only docks count (Warfare's secondary).
 */
export function producerList(game: Game, state: GameState, systemId: string, pack: DataPack, source: ProductionSource = 'system'): Producer[] {
  return producersOn(groundOf(game, state, pack), systemId, pack, source);
}
/** The planets of my producers in a system, docks first: ground forces may be placed on them (68.3). */
export const producers = (game: Game, state: GameState, systemId: string, pack: DataPack): string[] => producerPlanets(groundOf(game, state, pack), systemId, pack);
/** Effect: the built units stand where `placesOf` puts them. */
export function placeProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets?: Record<string, UnitCounts>,
): void {
  for (const { unit, planetId, count } of placesOf(game, state, target, units, pack, onPlanets)) {
    add(planetId === null ? state.systems : state.ground, planetId ?? target, { [unit]: count });
  }
}
/**
 * Check, over the state just before the units are placed: a unit with Production to use and its value (67, 68.1, 79),
 * infantry only where a producer may build them (68.1 note 4), a war sun only for a player who may have one, no ships
 * among other players' ships (67.6, 14.1), the reinforcements (67.5, 72.1) and the planets ground forces go to (68.3).
 * The value is the pooled Production of the system's producers (`producerList`), changed by `productionTotal`; the
 * `entry` that plays components lets their `play` modifiers count.
 */
export function checkProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack,
  onPlanets: Record<string, UnitCounts> = {}, source: ProductionSource = 'system', step?: RuleStep, entry?: Entry,
): Warning[] {
  return checkProductionOn(groundOf(game, state, pack), target, units, pack, onPlanets, source, step, entry);
}
/**
 * The combined cost of a production as it is paid: each unit's cost (`unitCost`, with the laws and what the entry
 * plays), then the combined cost (`productionCost`, Sarween Tools) when a unit used PRODUCTION (`producing`; Sarween
 * ruling 1: units placed without one get no reduction).
 */
export function costOf(game: Game, state: GameState, units: UnitCounts, pack: DataPack, producing: boolean, entry?: Entry): number {
  return costOn(groundOf(game, state, pack), units, pack, producing, entry);
}
/** The tactical action's production is paid in resources: the payment is made, and a shortfall reported. `producing`: a unit used PRODUCTION. */
export function payProduction(game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[], producing = true): void {
  const cost = costOf(game, state, entry.production, pack, producing, entry);
  const paid = pay(state, entry.payment, 'resources', pack, warnings, { faction: game.faction });
  if (cost > paid) warnings.push(violation('shortResources', { needed: cost, paid }));
}

/**
 * What an entry owes for the units it produces, asked of `state` (the one before the entry in an editor; the one at
 * payment in the replay): the editor's label, the shop counter, the automatic payment and the check all ask this
 * one function, so they cannot disagree. Whether a unit uses PRODUCTION comes from the producers standing in the
 * entry's system in that state.
 */
export function productionDue(game: Game, state: GameState, units: UnitCounts, pack: DataPack, entry?: Entry): number {
  return productionDueOn(groundOf(game, state, pack), units, pack, entry);
}
