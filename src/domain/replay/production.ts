/** Step 89.5 Production (and the production of cards): which units produce, where built units stand, and what they cost. */
import { violation } from '../rules/registry';
import { homeSlot } from '../strategy';
import { applied } from '../effects/apply';
import { appliedFor } from '../effects/entryApply';
import '../effects/points/production';
import { holderOf, type Holder } from '../effects/registry';
import dockInfantry from '../rules/codes/dockInfantry';
import warSunLocked from '../rules/codes/warSunLocked';
import { planetValue } from '../payment';
import { wormholesOf } from '../movement';
import { productionCost, unitStats } from '../unitStats';
import type { DataPack, Entry, Game, GameState, RuleStep, UnitCounts, UnitId, Warning, WarningCode } from '../types';
import { hasAnomaly, isStation, planetsOf, tileAt, type MapSource } from './board';
import { unitIds } from './state';

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

/**
 * The printed Production of ships of a faction that the pack does not carry as a number, by the source id of the unit:
 * Duha Menaimon (Arborec flagship): "After you activate this system, you may produce up to 5 units in this system."
 * A flagship's ability is no component, so the replay counts it here as a producer of its own.
 */
const PRINTED_SHIP_PRODUCTION: Record<string, number> = { arborec_flagship: 5 };

/**
 * What the production maths reads of one player's side of the board, neutral of where it comes from: the old per-player
 * state (`groundOf`) or the game board (`src/game/queries.ts`). One implementation of the rules for both.
 */
export interface Ground {
  faction: string; map: MapSource; holder: Holder;
  /** Whether the player controls the planet (the ones they own, a space station included). */
  mine(planetId: string): boolean;
  dock(planetId: string): boolean;
  pds(planetId: string): number;
  attached(planetId: string): readonly string[];
  ground(planetId: string): UnitCounts;
  ships(systemId: string): UnitCounts;
  wormholes(systemId: string): string[];
  /** A planet's resources, after what the player holds changed them. */
  resources(planetId: string): number;
  /** Whether other players have ships in a system (with `ground`, any units there, on its planets too). */
  othersIn(systemId: string, ground: boolean): boolean;
  /** How many of a unit stand on the board for the player, ships and ground forces. */
  onBoard(unit: UnitId): number;
  /** The player's home system. */
  home(): string | null;
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

/** What the ships standing in a system produce by their own text (`PRINTED_SHIP_PRODUCTION`). */
function shipProduction(g: Ground, systemId: string, pack: DataPack): number {
  let value = 0;
  const ships = g.ships(systemId);
  for (const unit of unitIds(ships)) {
    value += (ships[unit] ?? 0) > 0 ? PRINTED_SHIP_PRODUCTION[unitStats(g.faction, unit, false, pack)?.id ?? ''] ?? 0 : 0;
  }
  return value;
}

/** A dock's Production: its planet's resources plus the dock's printed value (79.1), after what the player holds changed both (Space Dock II, Mining World). */
const dockValue = (g: Ground, planetId: string, pack: DataPack): number => {
  const printed = pack.structures.find(s => s.id === 'spacedock')?.levels.one.production ?? 0;
  // What is attached to the planet stands on my state (a rival's count asks none: its own state keeps no attachments).
  return applied(pack, g.holder, 'productionValue', g.resources(planetId) + printed, { structure: 'spacedock', planetId, attached: g.attached(planetId) }).value;
};

export function producersOn(g: Ground, systemId: string, pack: DataPack, source: ProductionSource = 'system'): Producer[] {
  if (hasAnomaly(g.map, systemId, 'scar', pack)) return [];
  const holder = g.holder;
  const mine = planetsOf(g.map, systemId, pack).filter(p => g.mine(p));
  const list: Producer[] = [];
  for (const planetId of mine.filter(p => g.dock(p))) {
    const value = dockValue(g, planetId, pack);
    list.push({ kind: 'dock', planetId, value, infantry: applied(pack, holder, 'dockInfantry', 1, { faction: g.faction, planetId }).value > 0 });
  }
  if (source === 'homeDock') return list;
  for (const planetId of mine) {
    const pds = g.pds(planetId);
    const each = pds > 0 ? applied(pack, holder, 'productionValue', 0, { structure: 'pds', planetId, attached: g.attached(planetId) }).value : 0;
    if (each > 0) list.push({ kind: 'pds', planetId, value: each * pds, infantry: true });
  }
  for (const planetId of mine) {
    if (isStation(pack, planetId)) continue;
    let value = 0;
    const here = g.ground(planetId);
    for (const unit of unitIds(here)) {
      const count = here[unit] ?? 0;
      const base = PRINTED_UNIT_PRODUCTION[unitStats(g.faction, unit, false, pack)?.id ?? ''] ?? 0;
      value += count * Math.max(0, applied(pack, holder, 'unitProduction', base, { faction: g.faction, unit, planetId }).value);
    }
    if (value > 0) list.push({ kind: 'unit', planetId, value, infantry: true });
  }
  for (const planetId of mine) {
    const structures = { pds: g.pds(planetId), spacedock: g.dock(planetId) ? 1 : 0 };
    const value = applied(pack, holder, 'planetProduction', 0, { planetId, systemId, structures }).value;
    if (value > 0) list.push({ kind: 'planet', planetId, value, infantry: true });
  }
  const standing = g.ships(systemId);
  if (unitIds(standing).length > 0) {
    const tile = tileAt(g.map, systemId, pack);
    const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter((a): a is NonNullable<typeof a> => a !== undefined);
    const value = applied(pack, holder, 'spaceProduction', 0, { systemId, anomalies, units: standing, wormholes: g.wormholes(systemId), game: g.map, pack }).value;
    if (value > 0) list.push({ kind: 'space', planetId: null, value, infantry: true });
  }
  const ships = shipProduction(g, systemId, pack);
  if (ships > 0) list.push({ kind: 'space', planetId: null, value: ships, infantry: true });
  return list;
}
export const producerPlanets = (g: Ground, systemId: string, pack: DataPack): string[] =>
  [...new Set(producersOn(g, systemId, pack).flatMap(p => (p.planetId === null ? [] : [p.planetId])))];
export function systemProductionOn(g: Ground, systemId: string, pack: DataPack, source: ProductionSource = 'system', entry?: Entry): number {
  const list = producersOn(g, systemId, pack, source);
  if (list.length === 0) return 0;
  const values = list.map(p => p.value);
  const total = source === 'homeDock' ? Math.max(...values) : values.reduce((sum, v) => sum + v, 0);
  return appliedFor(pack, g.holder, entry, 'productionTotal', total, { systemId, faction: g.faction }).value;
}

/** Where my ground forces may stand: a planet I control, and not a space station (space stations 4). */
const holdsGround = (g: Ground, planetId: string, pack: DataPack): boolean => g.mine(planetId) && !isStation(pack, planetId);

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

export function placesOn(g: Ground, target: string, units: UnitCounts, pack: DataPack, onPlanets: Record<string, UnitCounts> = {}): ProductionPlace[] {
  const places: ProductionPlace[] = [];
  // With no dock (which is warned about) they go on a planet of mine there, as the player most likely means.
  const dock = producerPlanets(g, target, pack)[0]
    ?? planetsOf(g.map, target, pack).find(p => holdsGround(g, p, pack)) ?? null;
  for (const unit of unitIds(units)) {
    let left = units[unit] ?? 0;
    const ground = pack.units[unit]?.ground ?? false;
    if (ground) {
      for (const [planetId, counts] of Object.entries(onPlanets)) {
        // A unit cannot be produced on a planet the player does not control (67.4.1): it goes where the dock puts it.
        if (!holdsGround(g, planetId, pack)) continue;
        const count = Math.min(left, counts[unit] ?? 0);
        if (count > 0) places.push({ unit, planetId, count });
        left -= count;
      }
    }
    if (left > 0) places.push({ unit, planetId: ground ? dock : null, count: left });
  }
  return places;
}

/** How many of a unit stand on the board in this state, ships and ground forces. */
export const unitsOnBoard = (state: GameState, unit: UnitId): number =>
  [...Object.values(state.systems), ...Object.values(state.ground)].reduce((sum, counts) => sum + (counts[unit] ?? 0), 0);
const limitWarnings = (onBoardOf: (unit: UnitId) => number, units: UnitCounts, pack: DataPack, step?: RuleStep): Warning[] => {
  const warnings: Warning[] = [];
  for (const unit of unitIds(units)) {
    const limit = pack.units[unit]?.limit;
    if (limit === null || limit === undefined || unit === 'fighter' || unit === 'infantry') continue;
    const onBoard = onBoardOf(unit);
    if (onBoard + (units[unit] ?? 0) > limit) warnings.push(violation('reinforcementsOut', { unit, limit, have: onBoard }, step));
  }
  return warnings;
};
export function checkProductionOn(
  g: Ground, target: string, units: UnitCounts, pack: DataPack,
  onPlanets: Record<string, UnitCounts> = {}, source: ProductionSource = 'system', step?: RuleStep, entry?: Entry,
): Warning[] {
  const built = unitIds(units);
  if (built.length === 0) return [];
  const warnings: Warning[] = [];
  const warn = (code: WarningCode, params: Record<string, string | number>) => warnings.push(violation(code, params, step));
  const list = source === 'homeDock' && g.home() !== target ? [] : producersOn(g, target, pack, source);
  const docks = list.flatMap(p => (p.planetId === null ? [] : [p.planetId]));
  if (hasAnomaly(g.map, target, 'scar', pack)) warn('scarProduction', { systemId: target });
  else if (list.length === 0) warn('noProduction', { systemId: target });
  else {
    if (source !== 'card') {
      const value = systemProductionOn(g, target, pack, source, entry);
      // Each fighter or infantry counts, though two cost one (68.1.2).
      const count = built.reduce((sum, id) => sum + (units[id] ?? 0), 0);
      if (count > value) warn('productionOver', { value, count });
    }
    if ((units.infantry ?? 0) > 0 && !list.some(p => p.kind !== 'dock' || p.infantry)) {
      warnings.push(violation(dockInfantry.code, { systemId: target }, step));
    }
  }
  if ((units.warsun ?? 0) > 0) warnings.push(violation(warSunLocked.code, { systemId: target }, step));
  if (built.some(id => !pack.units[id]?.ground) && g.othersIn(target, false)) {
    warn('productionBlockaded', { systemId: target });
    if (!hasShips(g.ships(target), pack)) warn('blockaded', { systemId: target });
  }
  warnings.push(...limitWarnings(g.onBoard, units, pack, step));
  for (const [planetId, counts] of Object.entries(onPlanets)) {
    // A Floating Factory, which every Saar space dock is, places its ground forces on any planet of its system (Saar, Floating Factory 2); so does a producing flagship in space.
    const floating = (g.faction === 'saar' || shipProduction(g, target, pack) > 0) && planetsOf(g.map, target, pack).includes(planetId);
    if (unitIds(counts).some(id => pack.units[id]?.ground) && !docks.includes(planetId) && !floating) warn('productionPlace', { planetId });
  }
  return warnings;
}

/** The system an entry produces in: the tactical action's, or the one its card or component names. */
const systemOfProduction = (entry: Entry | undefined): string | undefined =>
  entry?.type === 'tactical' ? entry.systemId ?? undefined : entry && 'effects' in entry ? entry.effects?.production?.systemId : undefined;
export function costOn(g: Ground, units: UnitCounts, pack: DataPack, producing: boolean, entry?: Entry): number {
  const cost = productionCost(units, g.faction, g.holder, pack, entry);
  if (!producing || cost <= 0) return cost;
  const systemId = systemOfProduction(entry);
  const wormholes = systemId === undefined ? [] : g.wormholes(systemId);
  return Math.max(0, appliedFor(pack, g.holder, entry, 'productionCost', cost, { faction: g.faction, systemId, wormholes, holdings: g.holder.holdings, pack }).value);
}

export function productionDueOn(g: Ground, units: UnitCounts, pack: DataPack, entry?: Entry): number {
  const systemId = systemOfProduction(entry);
  const producing = systemId !== undefined && producersOn(g, systemId, pack).length > 0;
  return costOn(g, units, pack, producing, entry);
}
