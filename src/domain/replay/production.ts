/** Step 89.5 Production (and the production of cards): which units produce, where built units stand, and what they cost. */
import { violation } from '../rules/registry';
import { homeSlot } from '../strategy';
import { applied } from '../effects/apply';
import { appliedFor } from '../effects/entryApply';
import '../effects/points/production';
import { holderOf } from '../effects/registry';
import dockInfantry from '../rules/codes/dockInfantry';
import warSunLocked from '../rules/codes/warSunLocked';
import { wormholesOf } from '../movement';
import { productionCost, unitStats } from '../unitStats';
import type { DataPack, Entry, Game, GameState, RuleStep, UnitCounts, UnitId, Warning, WarningCode } from '../types';
import { hasAnomaly, isStation, planetsOf, tileAt } from './board';
import { pay } from './payment';
import { add, unitIds, type TacticalEntry } from './state';
import { checkSystem } from './transport';

export { productionCost };

/** One of my units (or a planet, or a space area) that produces in a system, and its Production value (68.1). */
export interface Producer {
  kind: 'dock' | 'pds' | 'unit' | 'planet' | 'space';
  /** The planet it stands on; null for a space area. */
  planetId: string | null;
  /** Its PRODUCTION, all its units together. */
  value: number;
  /** Whether its value may build infantry (68.1 note 4). */
  infantry: boolean;
}

/**
 * Which units a production may use: those of the system (a tactical action), one space dock in the home system
 * (Warfare's secondary, 99.3), or a dock of the system with a value the card text sets (another card).
 */
export type ProductionSource = 'system' | 'homeDock' | 'card';

/**
 * The printed PRODUCTION of faction units the pack does not carry, by the source id of the level I unit (the Letani
 * Warrior, 1). A component changes it through the point `unitProduction`.
 */
const PRINTED_UNIT_PRODUCTION: Record<string, number> = { arborec_infantry: 1 };

/** A dock's Production: its planet's resources plus the dock's printed value (79.1), after what the player holds changed both (Space Dock II, Mining World). */
const dockValue = (game: Game, state: GameState, planetId: string, pack: DataPack): number => {
  const holder = holderOf(game, state);
  const printed = pack.structures.find(s => s.id === 'spacedock')?.levels.one.production ?? 0;
  const resources = applied(pack, holder, 'planetResources', pack.planets[planetId]?.resources ?? 0, { planetId, dock: true }).value;
  return applied(pack, holder, 'productionValue', resources + printed, { structure: 'spacedock', planetId }).value;
};

/**
 * Everything of mine that produces in a system, in the order docks, PDS, units, planets, space (the first dock is where
 * ground forces go with no choice). My space docks on planets I control, since an opponent's dock gives me nothing
 * (79.4); then what components make a producer through the points `productionValue` (a PDS, base 0), `unitProduction`,
 * `planetProduction` and `spaceProduction` (a value above 0). Units in an entropic scar cannot use Production
 * (Thunder's Edge, entropic scars 2), so there are none. With `homeDock` only docks count (Warfare's secondary).
 */
export function producerList(game: Game, state: GameState, systemId: string, pack: DataPack, source: ProductionSource = 'system'): Producer[] {
  if (hasAnomaly(game, systemId, 'scar', pack)) return [];
  const holder = holderOf(game, state);
  const mine = planetsOf(game, systemId, pack).filter(p => state.control[p] === 'me');
  const list: Producer[] = [];
  for (const planetId of mine.filter(p => state.docks.includes(p))) {
    const value = dockValue(game, state, planetId, pack);
    list.push({ kind: 'dock', planetId, value, infantry: applied(pack, holder, 'dockInfantry', 1, { faction: game.faction, planetId }).value > 0 });
  }
  if (source === 'homeDock') return list;
  for (const planetId of mine) {
    const pds = state.pds[planetId] ?? 0;
    const each = pds > 0 ? applied(pack, holder, 'productionValue', 0, { structure: 'pds', planetId }).value : 0;
    if (each > 0) list.push({ kind: 'pds', planetId, value: each * pds, infantry: true });
  }
  for (const planetId of mine) {
    if (isStation(pack, planetId)) continue;
    let value = 0;
    for (const unit of unitIds(state.ground[planetId] ?? {})) {
      const count = state.ground[planetId]?.[unit] ?? 0;
      const base = PRINTED_UNIT_PRODUCTION[unitStats(game.faction, unit, false, pack)?.id ?? ''] ?? 0;
      value += count * Math.max(0, applied(pack, holder, 'unitProduction', base, { faction: game.faction, unit, planetId }).value);
    }
    if (value > 0) list.push({ kind: 'unit', planetId, value, infantry: true });
  }
  for (const planetId of mine) {
    const structures = { pds: state.pds[planetId] ?? 0, spacedock: state.docks.includes(planetId) ? 1 : 0 };
    const value = applied(pack, holder, 'planetProduction', 0, { planetId, systemId, structures }).value;
    if (value > 0) list.push({ kind: 'planet', planetId, value, infantry: true });
  }
  if (unitIds(state.systems[systemId] ?? {}).length > 0) {
    const tile = tileAt(game, systemId, pack);
    const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter((a): a is NonNullable<typeof a> => a !== undefined);
    const value = applied(pack, holder, 'spaceProduction', 0, { systemId, anomalies, units: state.systems[systemId] ?? {}, wormholes: wormholesOf(game, pack, systemId, state.wormholeTokens), game, pack }).value;
    if (value > 0) list.push({ kind: 'space', planetId: null, value, infantry: true });
  }
  return list;
}

/** The planets of my producers in a system, docks first: ground forces may be placed on them (68.3). */
export const producers = (game: Game, state: GameState, systemId: string, pack: DataPack): string[] =>
  [...new Set(producerList(game, state, systemId, pack).flatMap(p => (p.planetId === null ? [] : [p.planetId])))];

/**
 * The Production value of a system as the check counts it: its producers pooled (68.1.1), then the total changed
 * (War Machine, with the entry that plays it). With `homeDock` the largest dock alone (99.3). 0 with no producer.
 */
export function systemProduction(game: Game, state: GameState, systemId: string, pack: DataPack, source: ProductionSource = 'system', entry?: Entry): number {
  const list = producerList(game, state, systemId, pack, source);
  if (list.length === 0) return 0;
  const values = list.map(p => p.value);
  const total = source === 'homeDock' ? Math.max(...values) : values.reduce((sum, v) => sum + v, 0);
  return appliedFor(pack, holderOf(game, state), entry, 'productionTotal', total, { systemId, faction: game.faction }).value;
}

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

/** How many of a unit stand on the board in this state, ships and ground forces. */
export const unitsOnBoard = (state: GameState, unit: UnitId): number =>
  [...Object.values(state.systems), ...Object.values(state.ground)].reduce((sum, counts) => sum + (counts[unit] ?? 0), 0);

/**
 * The reinforcement limit of the pieces of the game for units about to be placed (67.5, 72.1, 96.2): one warning per
 * unit type that would pass it. Fighters and infantry are not limited: tokens stand in for them (67.5.2, 96 note 2.1).
 * Any step that puts units on the board from the reinforcements (a production, the play of a component) asks this.
 */
export function unitLimitWarnings(state: GameState, units: UnitCounts, pack: DataPack, step?: RuleStep): Warning[] {
  const warnings: Warning[] = [];
  for (const unit of unitIds(units)) {
    const limit = pack.units[unit]?.limit;
    if (limit === null || limit === undefined || unit === 'fighter' || unit === 'infantry') continue;
    const onBoard = unitsOnBoard(state, unit);
    if (onBoard + (units[unit] ?? 0) > limit) warnings.push(violation('reinforcementsOut', { unit, limit, have: onBoard }, step));
  }
  return warnings;
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
  const built = unitIds(units);
  if (built.length === 0) return [];
  const warnings: Warning[] = [];
  const warn = (code: WarningCode, params: Record<string, string | number>) => warnings.push(violation(code, params, step));
  const list = source === 'homeDock' && homeSlot(game, pack) !== target ? [] : producerList(game, state, target, pack, source);
  const docks = list.flatMap(p => (p.planetId === null ? [] : [p.planetId]));
  if (hasAnomaly(game, target, 'scar', pack)) warn('scarProduction', { systemId: target });
  else if (list.length === 0) warn('noProduction', { systemId: target });
  else {
    if (source !== 'card') {
      const value = systemProduction(game, state, target, pack, source, entry);
      // Each fighter or infantry counts, though two cost one (68.1.2).
      const count = built.reduce((sum, id) => sum + (units[id] ?? 0), 0);
      if (count > value) warn('productionOver', { value, count });
    }
    if ((units.infantry ?? 0) > 0 && !list.some(p => p.kind !== 'dock' || p.infantry)) {
      warnings.push(violation(dockInfantry.code, { systemId: target }, step));
    }
  }
  if ((units.warsun ?? 0) > 0) warnings.push(violation(warSunLocked.code, { systemId: target }, step));
  if (built.some(id => !pack.units[id]?.ground) && othersIn(game, state, target, pack)) {
    warn('productionBlockaded', { systemId: target });
    if (!hasShips(state.systems[target], pack)) warn('blockaded', { systemId: target });
  }
  warnings.push(...unitLimitWarnings(state, units, pack, step));
  for (const [planetId, counts] of Object.entries(onPlanets)) {
    if (unitIds(counts).some(id => pack.units[id]?.ground) && !docks.includes(planetId)) warn('productionPlace', { planetId });
  }
  return warnings;
}

/** The system an entry produces in: the tactical action's, or the one its card or component names. */
const systemOfProduction = (entry: Entry | undefined): string | undefined =>
  entry?.type === 'tactical' ? entry.systemId ?? undefined : entry && 'effects' in entry ? entry.effects?.production?.systemId : undefined;

/**
 * The combined cost of a production as it is paid: each unit's cost (`unitCost`, with the laws and what the entry
 * plays), then the combined cost (`productionCost`, Sarween Tools) when a unit used PRODUCTION (`producing`; Sarween
 * ruling 1: units placed without one get no reduction).
 */
export function costOf(game: Game, state: GameState, units: UnitCounts, pack: DataPack, producing: boolean, entry?: Entry): number {
  const holder = holderOf(game, state);
  const cost = productionCost(units, game.faction, holder, pack, entry);
  if (!producing || cost <= 0) return cost;
  const systemId = systemOfProduction(entry);
  const wormholes = systemId === undefined ? [] : wormholesOf(game, pack, systemId, state.wormholeTokens);
  return Math.max(0, appliedFor(pack, holder, entry, 'productionCost', cost, { faction: game.faction, systemId, wormholes, holdings: state.holdings, pack }).value);
}

/** The tactical action's production is paid in resources: the payment is made, and a shortfall reported. `producing`: a unit used PRODUCTION. */
export function payProduction(game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[], producing = true): void {
  const cost = costOf(game, state, entry.production, pack, producing, entry);
  const paid = pay(state, entry.payment, 'resources', pack, warnings, { faction: game.faction });
  if (cost > paid) warnings.push(violation('shortResources', { needed: cost, paid }));
}

/**
 * The production of a component's entry (`effects.production`, as a card's: a hero that produces, a technology that
 * builds): checked as one of a tactical action in its system, placed, paid for with `effects.payment`, and its system
 * checked for what it holds.
 */
export function applyComponentProduction(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'component' }>, pack: DataPack, warnings: Warning[],
): void {
  const made = entry.effects?.production;
  if (!made || unitIds(made.units).length === 0) return;
  warnings.push(...checkProduction(game, state, made.systemId, made.units, pack, made.ground, 'system', undefined, entry));
  const producing = producerList(game, state, made.systemId, pack).length > 0;
  placeProduction(game, state, made.systemId, made.units, pack, made.ground);
  const cost = costOf(game, state, made.units, pack, producing, entry);
  const paid = pay(state, entry.effects?.payment ?? { planets: [], tradeGoods: 0 }, 'resources', pack, warnings, { faction: game.faction });
  if (cost > paid) warnings.push(violation('shortResources', { needed: cost, paid }));
  warnings.push(...checkSystem(game, state, made.systemId, pack));
}
