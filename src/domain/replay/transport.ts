/** Transport (LRR 95, 16): pickups, the capacity of each moving group and of a system, and what a system holds against the fleet pool. */
import { applied } from '../effects/apply';
import '../effects/points/production';
import { holderOf } from '../effects/registry';
import { waive } from '../effects/waivers';
import { blockersOf, fullPath, shipSpeed, type Blockers } from '../movement';
import { violation } from '../rules/registry';
import { unitStats } from '../unitStats';
import type { DataPack, Game, GameState, Holdings, UnitCounts, Warning } from '../types';
import { planetsOf, sourceSlot } from './board';
import { gameAs } from '../players';
import { take, unitIds, type Move } from './state';

/** A move that only picks units up, so no route to check: from a planet, from the active system itself, or marked as a pickup. */
export const isPickup = (move: Move, target: string, pack: DataPack): boolean =>
  move.pickupOf !== undefined || move.from in pack.planets || move.from === target;

/** Whether units may be picked up in a system: not where my command token lies, unless it is the active system (95.3). */
export const pickupAllowed = (state: Pick<GameState, 'tokensOnMap'>, target: string, slot: string): boolean =>
  slot === target || !state.tokensOnMap.includes(slot);

/**
 * Check, after the activation: a ship picks units up only in the system it starts in, one it passes or the active one
 * (95.1), and never where my command token lies other than the active system (95.3).
 */
export function checkPickups(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, blockers: Blockers = blockersOf(game, null, undefined, pack)): Warning[] {
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
    if (!pickupAllowed(state, target, slot) && !sources.has(slot) && !warned.has(`${from}:${slot}`)) {
      warned.add(`${from}:${slot}`);
      warnings.push(violation('sourceActivated', { from, systemId: slot, context: 'pickup' }, 'transport'));
    }
  }
  return warnings;
}

/** Whether my fighters move by themselves at this point of the replay: they have a move value. */
export const fightersFly = (game: Game, holdings: Holdings, pack: DataPack): boolean =>
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
export const dockFighterRoom = (game: Game, state: Pick<GameState, 'docks' | 'holdings' | 'control' | 'laws'>, systemId: string, pack: DataPack): number =>
  planetsOf(game, systemId, pack).filter(planetId => state.docks.includes(planetId))
    // What a dock keeps is the point `dockFighters` (Dimensional Tear II: 12).
    .reduce((sum, planetId) => sum + applied(pack, holderOf(game, state), 'dockFighters', DOCK_FIGHTERS, { planetId, systemId }).value, 0);

/** Fighters a dock keeps, out of those present: they count neither as load nor as ships. */
const keptFighters = (units: UnitCounts, fighterRoom: number): number => Math.min(units.fighter ?? 0, Math.max(0, fighterRoom));

/**
 * Cargo against the capacity of my ships at my current levels: only ground forces and fighters that do not fly count as
 * load. `fighterRoom` is what the system's space docks keep (`dockFighterRoom`): up to that many fighters are no load.
 */
export function capacity(game: Game, units: UnitCounts, holdings: Holdings, pack: DataPack, fighterRoom = 0): { load: number; capacity: number } {
  const flying = fightersFly(game, holdings, pack);
  let load = 0;
  let cap = 0;
  for (const id of unitIds(units)) {
    const def = pack.units[id];
    if (!def) continue;
    const n = (units[id] ?? 0) - (def.fighter ? keptFighters(units, fighterRoom) : 0);
    if (def.ground || (def.fighter && !flying)) load += n * def.capacityUsed;
    else if (!def.fighter) cap += n * applied(pack, { holdings, faction: game.faction }, 'capacity', unitStats(game.faction, id, false, pack)?.capacity ?? 0, { faction: game.faction, unit: id }).value;
  }
  return { load, capacity: cap };
}

/**
 * Ships for the fleet pool: flying fighters beyond the capacity left after the ground forces count as ships; those the
 * system's space docks keep (`fighterRoom`) do not.
 */
export function fleetCount(game: Game, units: UnitCounts, holdings: Holdings, pack: DataPack, fighterRoom = 0): number {
  const ships = unitIds(units).reduce((sum, id) => {
    const def = pack.units[id];
    return def && !def.fighter && !def.ground ? sum + (units[id] ?? 0) : sum;
  }, 0);
  if (!fightersFly(game, holdings, pack)) return ships;
  const { load, capacity: cap } = capacity(game, units, holdings, pack);
  return ships + Math.max(0, (units.fighter ?? 0) - keptFighters(units, fighterRoom) - Math.max(0, cap - load));
}

/** What a system's stack holds against the fleet pool and its own capacity, with the fighters its space docks keep. */
export function systemMeters(game: Game, units: UnitCounts, holdings: Holdings, pack: DataPack, fighterRoom = 0): { load: number; capacity: number; ships: number } {
  return { ...capacity(game, units, holdings, pack, fighterRoom), ships: fleetCount(game, units, holdings, pack, fighterRoom) };
}

/** Check: each group that left a system carries no more than its ships' capacity. */
export function checkGroups(game: Game, state: GameState, groups: Record<string, UnitCounts>, pack: DataPack): Warning[] {
  return Object.entries(groups).flatMap(([from, units]) => {
    const group = capacity(game, units, state.holdings, pack);
    return group.load > group.capacity ? [violation('capacityGroup', { from, load: group.load, capacity: group.capacity })] : [];
  });
}

/** How far each system units leave is over its capacity, before or after the move. */
export function overflowLeft(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack): Map<string, number> {
  const left = new Set(moves.filter(move => !(move.from in pack.planets) && move.from !== target).map(move => move.from));
  return new Map([...left].map(slot => {
    const { load, capacity: room } = capacity(game, state.systems[slot] ?? {}, state.holdings, pack, dockFighterRoom(game, state, slot, pack));
    return [slot, load - room];
  }));
}

/**
 * Check: what stays in the systems units left, against the capacity of the ships still there (16.3, 43.1, 95 note 4):
 * fighters and ground forces left in space without room on board are removed, which the plan must show. Only what the
 * leaving adds is warned about: ground forces of a start stand in the space of the home system.
 */
export function checkLeftBehind(game: Game, state: GameState, before: Map<string, number>, target: string, moves: Move[], pack: DataPack): Warning[] {
  return [...overflowLeft(game, state, target, moves, pack)].flatMap(([slot, over]) => {
    if (over <= 0 || over <= (before.get(slot) ?? 0)) return [];
    const { load, capacity: room } = capacity(game, state.systems[slot] ?? {}, state.holdings, pack, dockFighterRoom(game, state, slot, pack));
    return [violation('capacitySystem', { systemId: slot, load, capacity: room })];
  });
}

/**
 * Effect (37.3, note 2): the ships the player chose to remove beyond the fleet pool leave the active system, as many of
 * each type as stand there now; the rest is returned, to be removed after the production that builds them.
 */
export function removeFleetExcess(state: GameState, target: string, removals: UnitCounts): UnitCounts {
  const here = state.systems[target] ?? {};
  const now: UnitCounts = {};
  const later: UnitCounts = {};
  for (const id of unitIds(removals)) {
    const wanted = removals[id] ?? 0;
    const taken = Math.min(wanted, here[id] ?? 0);
    if (taken > 0) now[id] = taken;
    if (wanted > taken) later[id] = wanted - taken;
  }
  take(state.systems, target, now, []);
  return later;
}

/**
 * What the board itself breaks in a system, apart from any entry: each player's capacity and fleet pool there (16.3,
 * 37.1), as units placed by hand leave them. A big hex placing by hand checks this; it forbids nothing.
 */
export function boardSystemWarnings(game: Game, state: GameState, slot: string, pack: DataPack): Warning[] {
  const players: [Game, GameState][] = [[game, state], ...Object.entries(state.rivals ?? {}).map(([id, held]): [Game, GameState] => [gameAs(game, id), held])];
  // What a player's components in force lift of it is marked, as for an entry.
  return players.flatMap(([view, held]) => waive(checkSystem(view, held, slot, pack), { pack, game: view, before: held, after: held, shared: state }));
}

/** Check: the capacity and the fleet pool of a system after units arrived or were built there. */
export function checkSystem(game: Game, state: GameState, target: string, pack: DataPack): Warning[] {
  const warnings: Warning[] = [];
  const here = state.systems[target] ?? {};
  const room = dockFighterRoom(game, state, target, pack);
  const load = capacity(game, here, state.holdings, pack, room);
  if (load.load > load.capacity) {
    warnings.push(violation('capacitySystem', { systemId: target, load: load.load, capacity: load.capacity }));
  }
  const ships = fleetCount(game, here, state.holdings, pack, room);
  const limit = fleetLimit(game, state, pack);
  if (ships > limit) warnings.push(violation('fleetPool', { systemId: target, ships, fleet: limit }));
  return warnings;
}
