import type { DataPack, UnitId, UnitCounts, RuleStep, Warning } from '../../../../domain/types';
import type { Game, Entry } from '../types';
import type { GameState } from '../types';
import { planetsOf } from '../../../../domain/replay/board';
import { unitIds, add, type TacticalEntry } from '../../../../domain/replay/state';
import { hasShips, type Ground, type ProductionPlace, placesOn, productionDueOn, type ProductionSource, type Producer, producersOn, producerPlanets, checkProductionOn, costOn } from '../../../../domain/replay/production';
import { homeSlot } from '../../../../domain/strategy';
import { holderOf } from '../../../../domain/effects/registry';
import { planetValue } from '../../../../domain/payment';
import { wormholesOf } from '../../../../domain/movement';
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

/**
 * Ships go to the space area; ground forces to the planets they were bought on where they may stand, the rest to the
 * planet holding the producing dock (68.3), or to the space area with no planet for them.
 */
export function placesOf(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets: Record<string, UnitCounts> = {},
): ProductionPlace[] {
  return placesOn(groundOf(game, state, pack), target, units, pack, onPlanets);
}

/** The old per-player state as a `Ground`. */
export function groundOf(game: Game, state: GameState, pack: DataPack): Ground {
  return {
    faction: game.faction, map: game, holder: holderOf(game, state),
    mine: planetId => state.control[planetId] === 'me',
    dock: planetId => state.docks.includes(planetId),
    pds: planetId => state.pds[planetId] ?? 0,
    attached: planetId => state.attachments?.[planetId] ?? [],
    ground: planetId => state.ground[planetId] ?? {},
    ships: systemId => state.systems[systemId] ?? {},
    wormholes: systemId => wormholesOf(game, pack, systemId, state.wormholeTokens),
    resources: planetId => planetValue(pack, state, planetId, 'resources', { faction: game.faction, shared: state }),
    othersIn: (systemId, withGround) => othersIn(game, state, systemId, pack, withGround),
    onBoard: unit => unitsOnBoard(state, unit),
    home: () => homeSlot(game, pack),
  };
}

/** How many of a unit stand on the board in this state, ships and ground forces. */
export const unitsOnBoard = (state: GameState, unit: UnitId): number =>
  [...Object.values(state.systems), ...Object.values(state.ground)].reduce((sum, counts) => sum + (counts[unit] ?? 0), 0);

/**
 * Whether other players have ships in a system (with `ground`, any units there, on its planets too): the opponents'
 * replayed state, or what stands on the map for them when they are not counted.
 */
export function othersIn(game: Game, state: GameState, systemId: string, pack: DataPack, ground = false): boolean {
  const planets = ground ? planetsOf(game, systemId, pack) : [];
  const stacks = state.rivals
    ? Object.values(state.rivals).flatMap(r => [r.systems[systemId], ...planets.map(p => r.ground[p])])
    : [...Object.values(game.enemyUnits[systemId] ?? {}), ...planets.flatMap(p => Object.values(game.enemyGround[p] ?? {}))];
  return stacks.some(units => (ground ? unitIds(units ?? {}).length > 0 : hasShips(units, pack)));
}
