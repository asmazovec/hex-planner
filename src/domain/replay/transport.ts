/** Transport (LRR 95, 16): pickups, the capacity of each moving group and of a system, and what a system holds against the fleet pool. */
import { violation } from '../rules/registry';
import { unitStats } from '../unitStats';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../types';
import { unitIds, type Move } from './state';

/** A move that only picks units up, so no route to check: from a planet, from the active system itself, or marked as a pickup. */
// TODO(P2-013) #ws:transport #type:check #rule:95.1 #rule:95.3 #test:095-transport #size:m #pickup #token — Подборы пропускаются целиком: нет проверки, что подбор из старта, пути или активной системы (95.1), и что в системе подбора нет моего жетона (95.3). Тот баг, что нашёл пользователь
export const isPickup = (move: Move, target: string, pack: DataPack): boolean =>
  move.pickupOf !== undefined || move.from in pack.planets || move.from === target;

/** Whether my fighters move by themselves at this point of the replay: their current stat has a move value. */
export const fightersFly = (game: Game, upgrades: UnitId[], pack: DataPack): boolean =>
  (unitStats(game.faction, 'fighter', upgrades.includes('fighter'), pack)?.move ?? null) !== null;

/** Cargo against the capacity of my ships at my current levels: only ground units and fighters that do not fly count as load. */
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

/** Ships for the fleet pool: flying fighters beyond the capacity left after the ground units count as ships. */
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
// TODO(P2-014) #ws:transport #type:check #rule:16.3 #rule:16-note-4 #rule:43.1 #rule:55-note-1 #rule:95-note-4 #test:016-capacity #test:043-ground-forces #test:055-mechs #test:095-transport #size:m #capacity #left-behind — Места на борту проверяются только в активной системе: истребители и наземные войска, брошенные без мест на борту в системе, откуда улетели корабли, не дают нарушения
export function checkGroups(game: Game, state: GameState, groups: Record<string, UnitCounts>, pack: DataPack): Warning[] {
  return Object.entries(groups).flatMap(([from, units]) => {
    const group = capacity(game, units, state.upgrades, pack);
    return group.load > group.capacity ? [violation('capacityGroup', { from, load: group.load, capacity: group.capacity })] : [];
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
