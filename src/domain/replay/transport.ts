/** Transport (LRR 95, 16): pickups, the capacity of each moving group and of a system, and what a system holds against the fleet pool. */
import { blockersOf, fullPath, type Blockers } from '../movement';
import { violation } from '../rules/registry';
import { unitStats } from '../unitStats';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../types';
import { sourceSlot } from './board';
import { unitIds, type Move } from './state';

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

/** Whether my fighters move by themselves at this point of the replay: their current stat has a move value. */
export const fightersFly = (game: Game, upgrades: UnitId[], pack: DataPack): boolean =>
  (unitStats(game.faction, 'fighter', upgrades.includes('fighter'), pack)?.move ?? null) !== null;

/** Cargo against the capacity of my ships at my current levels: only ground forces and fighters that do not fly count as load. */
export function capacity(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): { load: number; capacity: number } {
  const flying = fightersFly(game, upgrades, pack);
  let load = 0;
  let cap = 0;
  for (const id of unitIds(units)) {
    const def = pack.units[id];
    if (!def) continue;
    const n = units[id] ?? 0;
    if (def.ground || (def.fighter && !flying)) load += n * def.capacityUsed;
    else if (!def.fighter) cap += n * (unitStats(game.faction, id, upgrades.includes(id), pack)?.capacity ?? 0);
  }
  return { load, capacity: cap };
}

/** Ships for the fleet pool: flying fighters beyond the capacity left after the ground forces count as ships. */
export function fleetCount(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): number {
  const ships = unitIds(units).reduce((sum, id) => {
    const def = pack.units[id];
    return def && !def.fighter && !def.ground ? sum + (units[id] ?? 0) : sum;
  }, 0);
  if (!fightersFly(game, upgrades, pack)) return ships;
  const { load, capacity: cap } = capacity(game, units, upgrades, pack);
  return ships + Math.max(0, (units.fighter ?? 0) - Math.max(0, cap - load));
}

/** What a system's stack holds against the fleet pool and its own capacity. */
export function systemMeters(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): { load: number; capacity: number; ships: number } {
  return { ...capacity(game, units, upgrades, pack), ships: fleetCount(game, units, upgrades, pack) };
}

/** Check: each group that left a system carries no more than its ships' capacity. */
export function checkGroups(game: Game, state: GameState, groups: Record<string, UnitCounts>, pack: DataPack): Warning[] {
  return Object.entries(groups).flatMap(([from, units]) => {
    const group = capacity(game, units, state.upgrades, pack);
    return group.load > group.capacity ? [violation('capacityGroup', { from, load: group.load, capacity: group.capacity })] : [];
  });
}

/** How far each system units leave is over its capacity, before or after the move. */
export function overflowLeft(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack): Map<string, number> {
  const left = new Set(moves.filter(move => !(move.from in pack.planets) && move.from !== target).map(move => move.from));
  return new Map([...left].map(slot => {
    const { load, capacity: room } = capacity(game, state.systems[slot] ?? {}, state.upgrades, pack);
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
    const { load, capacity: room } = capacity(game, state.systems[slot] ?? {}, state.upgrades, pack);
    return [violation('capacitySystem', { systemId: slot, load, capacity: room })];
  });
}

/** Check: the capacity and the fleet pool of a system after units arrived or were built there. */
export function checkSystem(game: Game, state: GameState, target: string, pack: DataPack): Warning[] {
  const warnings: Warning[] = [];
  const here = state.systems[target] ?? {};
  const load = capacity(game, here, state.upgrades, pack);
  if (load.load > load.capacity) {
    warnings.push(violation('capacitySystem', { systemId: target, load: load.load, capacity: load.capacity }));
  }
  const ships = fleetCount(game, here, state.upgrades, pack);
  if (ships > state.fleet) warnings.push(violation('fleetPool', { systemId: target, ships, fleet: state.fleet }));
  return warnings;
}
