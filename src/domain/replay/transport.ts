/** Transport (LRR 95, 16): pickups, the capacity of each moving group and of a system, and what a system holds against the fleet pool. */
import { applied } from '../effects/apply';
import '../effects/points/production';
import { holderFor, holderOf, type Who } from '../effects/registry';
import { fullPath, shipSpeed, type Blockers } from '../movement';
import { violation } from '../rules/registry';
import { unitStats } from '../unitStats';
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import type { TokensOn } from '../readers';
import { planetsOf, sourceSlot, type MapSource } from './board';
import { unitIds, type Move } from './state';

/** A move that only picks units up, so no route to check: from a planet, from the active system itself, or marked as a pickup. */
export const isPickup = (move: Move, target: string, pack: DataPack): boolean =>
  move.pickupOf !== undefined || move.from in pack.planets || move.from === target;

/** Whether units may be picked up in a system: not where my command token lies, unless it is the active system (95.3). */
export const pickupAllowed = (state: TokensOn, target: string, slot: string): boolean =>
  slot === target || !state.tokensOnMap.includes(slot);

/** The same over a reader of the mover's command tokens: one implementation for the old state and the board. */
export function checkPickupsOf(game: MapSource, tokenAt: (slot: string) => boolean, target: string, moves: Move[], pack: DataPack, blockers: Blockers): Warning[] {
  const sources = new Set(moves.filter(move => !isPickup(move, target, pack)).map(move => move.from));
  const warnings: Warning[] = [];
  const warned = new Set<string>();
  for (const move of moves) {
    if (!isPickup(move, target, pack)) continue;
    const slot = sourceSlot(game, pack, move.from);
    if (slot === null || slot === target) continue;
    const from = move.pickupOf ?? slot;
    if (move.pickupOf !== undefined) {
      const carrier = moves.find(other => other.from === move.pickupOf && other.pickupOf === undefined);
      if (!fullPath(game, [move.pickupOf, ...(carrier?.via ?? []), target], pack, blockers).includes(slot)) {
        warnings.push(violation('pickupOffRoute', { from, systemId: slot }));
      }
    }
    // A source holding my token is warned about by its route already.
    if (slot !== target && tokenAt(slot) && !sources.has(slot) && !warned.has(`${from}:${slot}`)) {
      warned.add(`${from}:${slot}`);
      warnings.push(violation('sourceActivated', { from, systemId: slot, context: 'pickup' }, 'transport'));
    }
  }
  return warnings;
}

/** Whether my fighters move by themselves at this point of the replay: they have a move value. */
export const fightersFly = (game: Pick<Game, 'faction'>, holdings: Who, pack: DataPack): boolean =>
  shipSpeed(game, 'fighter', holdings, pack) !== null;

/** The ships a system of the player may hold: the fleet pool, after what they hold changed it. */
export const fleetLimit = (game: Game, state: GameState, pack: DataPack): number =>
  applied(pack, holderOf(game, state), 'fleetLimit', state.fleet, { faction: game.faction }).value;

/** Fighters each space dock keeps in its system apart from the ships' capacity (Space Dock I and II). */
export const DOCK_FIGHTERS = 3;

/**
 * The fighters a player's space docks keep in a system: 3 for each of their docks on its planets. They count only for
 * what stands in the system after movement: a moving group keeps its fighters on board (79 note 2, 2.1).
 */
export const dockFighterRoom = (game: Game, state: Pick<GameState, 'docks'> & Partial<Pick<GameState, 'holdings' | 'control' | 'laws'>>, systemId: string, pack: DataPack): number =>
  dockRoom(game.faction, planetsOf(game, systemId, pack).filter(planetId => state.docks.includes(planetId)), systemId,
    state.holdings ? holderOf(game, { holdings: state.holdings, control: state.control ?? {}, laws: state.laws }) : undefined, pack);

/** The same from the docks' planets themselves: what each keeps is the point `dockFighters` (Dimensional Tear II: 12). */
export const dockRoom = (faction: string, docked: readonly string[], systemId: string, holder: Who | undefined, pack: DataPack): number =>
  docked.reduce((sum, planetId) => sum + (holder
    ? applied(pack, holderFor(holder, faction), 'dockFighters', DOCK_FIGHTERS, { faction, planetId, systemId }).value
    : DOCK_FIGHTERS), 0);

/** Fighters a dock keeps, out of those present: they count neither as load nor as ships. */
const keptFighters = (units: UnitCounts, fighterRoom: number): number => Math.min(units.fighter ?? 0, Math.max(0, fighterRoom));

/**
 * Cargo against the capacity of my ships at my current levels: only ground forces and fighters that do not fly count as
 * load. `fighterRoom` is what the system's space docks keep (`dockFighterRoom`): up to that many fighters are no load.
 */
export function capacity(game: Pick<Game, 'faction'>, units: UnitCounts, holdings: Who, pack: DataPack, fighterRoom = 0): { load: number; capacity: number } {
  const flying = fightersFly(game, holdings, pack);
  let load = 0;
  let cap = 0;
  for (const id of unitIds(units)) {
    const def = pack.units[id];
    if (!def) continue;
    const n = (units[id] ?? 0) - (def.fighter ? keptFighters(units, fighterRoom) : 0);
    if (def.ground || (def.fighter && !flying)) load += n * def.capacityUsed;
    else if (!def.fighter) cap += n * applied(pack, holderFor(holdings, game.faction), 'capacity', unitStats(game.faction, id, false, pack)?.capacity ?? 0, { faction: game.faction, unit: id }).value;
  }
  return { load, capacity: cap };
}

/**
 * Ships for the fleet pool: flying fighters beyond the capacity left after the ground forces count as ships; those the
 * system's space docks keep (`fighterRoom`) do not.
 */
export function fleetCount(game: Pick<Game, 'faction'>, units: UnitCounts, holdings: Who, pack: DataPack, fighterRoom = 0): number {
  const ships = unitIds(units).reduce((sum, id) => {
    const def = pack.units[id];
    return def && !def.fighter && !def.ground ? sum + (units[id] ?? 0) : sum;
  }, 0);
  if (!fightersFly(game, holdings, pack)) return ships;
  const { load, capacity: cap } = capacity(game, units, holdings, pack);
  const excess = Math.max(0, (units.fighter ?? 0) - keptFighters(units, fighterRoom) - Math.max(0, cap - load));
  // What counts of the excess is a point of the count: Hybrid Crystal Fighter II halves it; a half ship rounds up.
  return ships + Math.ceil(applied(pack, holderFor(holdings, game.faction), 'excessFighters', excess, { faction: game.faction }).value);
}

/** What a system's stack holds against the fleet pool and its own capacity, with the fighters its space docks keep. */
export function systemMeters(game: Pick<Game, 'faction'>, units: UnitCounts, holdings: Who, pack: DataPack, fighterRoom = 0): { load: number; capacity: number; ships: number } {
  return { ...capacity(game, units, holdings, pack, fighterRoom), ships: fleetCount(game, units, holdings, pack, fighterRoom) };
}

/**
 * What the transport checks read of one player, whoever holds the board: their units in the space area of a system, how a
 * stack measures against capacity and the fleet pool there (the system's space docks counted), and the pool itself.
 * `capacityIn` and `fleetIn` take `null` for a stack that stands in no system (a group on its way: no docks).
 */
export interface Stacks {
  units(slot: string): UnitCounts;
  capacityOf(units: UnitCounts, slot: string | null): { load: number; capacity: number };
  fleetOf(units: UnitCounts, slot: string | null): number;
  fleet(): number;
}

/** Check: each group that left a system carries no more than its ships' capacity. */
export const checkGroupsOf = (stacks: Stacks, groups: Record<string, UnitCounts>): Warning[] =>
  Object.entries(groups).flatMap(([from, units]) => {
    const group = stacks.capacityOf(units, null);
    return group.load > group.capacity ? [violation('capacityGroup', { from, load: group.load, capacity: group.capacity })] : [];
  });

/** How far each system units leave is over its capacity, before or after the move. */
export function overflowLeftOf(stacks: Stacks, target: string, moves: Move[], pack: DataPack): Map<string, number> {
  const left = new Set(moves.filter(move => !(move.from in pack.planets) && move.from !== target).map(move => move.from));
  return new Map([...left].map(slot => {
    const { load, capacity: room } = stacks.capacityOf(stacks.units(slot), slot);
    return [slot, load - room];
  }));
}

/**
 * Check: what stays in the systems units left, against the capacity of the ships still there (16.3, 43.1, 95 note 4):
 * fighters and ground forces left in space without room on board are removed, which the plan must show. Only what the
 * leaving adds is warned about.
 */
export function checkLeftBehindOf(stacks: Stacks, before: Map<string, number>, target: string, moves: Move[], pack: DataPack): Warning[] {
  return [...overflowLeftOf(stacks, target, moves, pack)].flatMap(([slot, over]) => {
    if (over <= 0 || over <= (before.get(slot) ?? 0)) return [];
    const { load, capacity: room } = stacks.capacityOf(stacks.units(slot), slot);
    return [violation('capacitySystem', { systemId: slot, load, capacity: room })];
  });
}

/** Check: the capacity and the fleet pool of a system after units arrived or were built there. */
export function checkSystemOf(stacks: Stacks, target: string): Warning[] {
  const warnings: Warning[] = [];
  const here = stacks.units(target);
  const load = stacks.capacityOf(here, target);
  if (load.load > load.capacity) {
    warnings.push(violation('capacitySystem', { systemId: target, load: load.load, capacity: load.capacity }));
  }
  const ships = stacks.fleetOf(here, target);
  const limit = stacks.fleet();
  if (ships > limit) warnings.push(violation('fleetPool', { systemId: target, ships, fleet: limit }));
  return warnings;
}
/**
 * Check on arrival, before the battle (37.3, 76.2): the ships in the active system against the fleet pool. `landed` are
 * the ground forces this action lands from the space area (not from a planet): they count as landed already, so the
 * fighters they make room for are no ships.
 */
export function checkArrivalOf(stacks: Stacks, target: string, landed: readonly UnitCounts[], pack: DataPack): Warning[] {
  const here: UnitCounts = { ...stacks.units(target) };
  for (const units of landed) {
    for (const id of unitIds(units)) if (pack.units[id]?.ground) here[id] = Math.max(0, (here[id] ?? 0) - (units[id] ?? 0));
  }
  const ships = stacks.fleetOf(here, target);
  const limit = stacks.fleet();
  return ships > limit ? [violation('fleetPool', { systemId: target, ships, fleet: limit })] : [];
}
