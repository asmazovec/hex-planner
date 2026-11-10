/** Step 89.5 Production (and the production of cards): which units produce, where built units stand, and what they cost. */
import { violation } from '../rules/registry';
import { homeSlot } from '../strategy';
import { applied } from '../effects/apply';
import { productionCost } from '../unitStats';
import type { DataPack, Game, GameState, RuleStep, UnitCounts, UnitId, Warning, WarningCode } from '../types';
import { hasAnomaly, isStation, planetsOf } from './board';
import { pay } from './payment';
import { add, unitIds, type TacticalEntry } from './state';

export { productionCost };

/**
 * My units with Production in a system: my space docks on planets I control, since an opponent's dock gives me nothing
 * (79.4). Units in an entropic scar cannot use Production (Thunder's Edge, entropic scars 2), so there are none.
 */
export function producers(game: Game, state: GameState, systemId: string, pack: DataPack): string[] {
  if (hasAnomaly(game, systemId, 'scar', pack)) return [];
  return planetsOf(game, systemId, pack).filter(p => state.docks.includes(p) && state.control[p] === 'me');
}

/** A dock's Production: its planet's resources plus the dock's printed value (79.1), after what the player holds changed it (Space Dock II). */
const dockValue = (state: GameState, planetId: string, pack: DataPack): number => {
  const printed = pack.structures.find(s => s.id === 'spacedock')?.levels.one.production ?? 0;
  return applied(pack, state.holdings, 'productionValue', (pack.planets[planetId]?.resources ?? 0) + printed, { structure: 'spacedock', planetId }).value;
};

/** Where my ground forces may stand: a planet I control, and not a space station (space stations 4). */
const holdsGround = (state: GameState, planetId: string, pack: DataPack): boolean =>
  state.control[planetId] === 'me' && !isStation(pack, planetId);

const hasShips = (units: UnitCounts | undefined, pack: DataPack): boolean =>
  unitIds(units ?? {}).some(id => !pack.units[id]?.ground);

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

export interface ProductionPlace { unit: UnitId; /** Null for the space area. */ planetId: string | null; count: number }

/**
 * Ships go to the space area; ground forces to the planets they were bought on where they may stand, the rest to the
 * planet holding the producing dock (68.3), or to the space area with no planet for them.
 */
export function placesOf(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets: Record<string, UnitCounts> = {},
): ProductionPlace[] {
  const places: ProductionPlace[] = [];
  // With no dock (which is warned about) they go on a planet of mine there, as the player most likely means.
  const dock = producers(game, state, target, pack)[0]
    ?? planetsOf(game, target, pack).find(p => holdsGround(state, p, pack)) ?? null;
  for (const unit of unitIds(units)) {
    let left = units[unit] ?? 0;
    const ground = pack.units[unit]?.ground ?? false;
    if (ground) {
      for (const [planetId, counts] of Object.entries(onPlanets)) {
        // A unit cannot be produced on a planet the player does not control (67.4.1): it goes where the dock puts it.
        if (!holdsGround(state, planetId, pack)) continue;
        const count = Math.min(left, counts[unit] ?? 0);
        if (count > 0) places.push({ unit, planetId, count });
        left -= count;
      }
    }
    if (left > 0) places.push({ unit, planetId: ground ? dock : null, count: left });
  }
  return places;
}

/** Effect: the built units stand where `placesOf` puts them. */
export function placeProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets?: Record<string, UnitCounts>,
): void {
  for (const { unit, planetId, count } of placesOf(game, state, target, units, pack, onPlanets)) {
    add(planetId === null ? state.systems : state.ground, planetId ?? target, { [unit]: count });
  }
}

/**
 * Which units a production may use: those of the system (a tactical action), one space dock in the home system
 * (Warfare's secondary, 99.3), or a dock of the system with a value the card text sets (another card).
 */
export type ProductionSource = 'system' | 'homeDock' | 'card';

/**
 * Check, over the state just before the units are placed: a unit with Production to use and its value (67, 68.1, 79),
 * no ships among other players' ships (67.6, 14.1), the reinforcements (67.5, 72.1) and the planets ground forces go to
 * (68.3). The upgrades of docks are not tracked, so a dock's value is that of Space Dock I.
 */
export function checkProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack,
  onPlanets: Record<string, UnitCounts> = {}, source: ProductionSource = 'system', step?: RuleStep,
): Warning[] {
  const built = unitIds(units);
  if (built.length === 0) return [];
  const warnings: Warning[] = [];
  const warn = (code: WarningCode, params: Record<string, string | number>) => warnings.push(violation(code, params, step));
  const docks = source === 'homeDock' && homeSlot(game, pack) !== target ? [] : producers(game, state, target, pack);
  if (hasAnomaly(game, target, 'scar', pack)) warn('scarProduction', { systemId: target });
  else if (docks.length === 0) warn('noProduction', { systemId: target });
  else if (source !== 'card') {
    const values = docks.map(p => dockValue(state, p, pack));
    const value = source === 'homeDock' ? Math.max(...values) : values.reduce((sum, v) => sum + v, 0);
    // Each fighter or infantry counts, though two cost one (68.1.2).
    const count = built.reduce((sum, id) => sum + (units[id] ?? 0), 0);
    if (count > value) warn('productionOver', { value, count });
  }
  if (built.some(id => !pack.units[id]?.ground) && othersIn(game, state, target, pack)) {
    warn('productionBlockaded', { systemId: target });
    if (!hasShips(state.systems[target], pack)) warn('blockaded', { systemId: target });
  }
  for (const unit of built) {
    const limit = pack.units[unit]?.limit;
    // Fighters and infantry are not limited: tokens stand in for them (67.5.2, 96 note 2.1).
    if (limit === null || limit === undefined || unit === 'fighter' || unit === 'infantry') continue;
    const onBoard = [...Object.values(state.systems), ...Object.values(state.ground)].reduce((sum, counts) => sum + (counts[unit] ?? 0), 0);
    if (onBoard + (units[unit] ?? 0) > limit) warn('reinforcementsOut', { unit, limit, have: onBoard });
  }
  for (const [planetId, counts] of Object.entries(onPlanets)) {
    if (unitIds(counts).some(id => pack.units[id]?.ground) && !docks.includes(planetId)) warn('productionPlace', { planetId });
  }
  return warnings;
}

/** The tactical action's production is paid in resources: the payment is made, and a shortfall reported. */
export function payProduction(game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): void {
  const cost = productionCost(entry.production, game.faction, state.holdings, pack);
  const paid = pay(state, entry.payment, 'resources', pack, warnings);
  if (cost > paid) warnings.push(violation('shortResources', { needed: cost, paid }));
}
