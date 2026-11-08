/**
 * The tactical action (LRR 89) as its steps, in order: 89.1 activation, 89.2 movement (with transport), 89.3 combat,
 * 89.4 invasion, 89.5 production and its payment, then the system's limits. Each step checks the state it is given, then
 * changes it; the steps themselves live in their own modules.
 */
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import { activate, checkActivation } from './activation';
import { removeGroundLosses, removeLosses } from './combat';
import { landUnits } from './invasion';
import { checkRoutes, moveUnits } from './movement';
import { payProduction, placeProduction, placesOf, type ProductionPlace } from './production';
import { unitIds, type TacticalEntry } from './state';
import { capacity, checkGroups, checkSystem, fleetCount, isPickup } from './transport';

/** Step 89.2: the routes are checked over the state before the move, then the units are carried; returns each source's group. */
function movement(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): Record<string, UnitCounts> {
  warnings.push(...checkRoutes(game, state, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack));
  return moveUnits(game, state, target, entry.moves, pack, warnings);
}

/** What happens in the target after the moves: losses, the landing, then what was built is placed. */
// TODO(P2-023) #ws:invasion #type:model #rule:27.2 #rule:27.3 #rule:49-note-4 #rule:54.1 #test:027-custodians-token #test:049-invasion #test:054-mecatol-rex #size:m #needs:decision #custodians — Нет жетона custodians: высадка на Mecatol Rex без 6 влияния и без очка. Решить, моделировать ли
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  // TODO(P2-019) #ws:combat-order #type:bug #rule:76.2 #rule:89.3 #test:076-ships #test:089-tactical-action #size:m #fleet-pool #capacity #battle — Потери снимаются до проверки флота и до высадки: флот надо проверять при прилёте (37.3), а высадку ограничивать местами на борту после боя (16.3.3). Порядок: прилёт → флот → бой → места на борту → высадка → производство
  removeLosses(state, target, entry, warnings);
  landUnits(state, target, entry, warnings);
  removeGroundLosses(state, entry, warnings);
  placeProduction(game, state, target, entry.production, pack, entry.productionGround);
}

export function applyTactical(
  game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  const target = entry.systemId;
  if (target === null) return;
  warnings.push(...checkActivation());
  activate(state, target, entry);
  const groups = movement(game, state, target, entry, pack, warnings);
  warnings.push(...checkGroups(game, state, groups, pack));
  landAndBuild(game, state, target, entry, pack, warnings);
  payProduction(game, state, entry, pack, warnings);
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) warnings.push(...checkSystem(game, state, target, pack));
}

/** The numbers behind `capacityGroup` and `fleetPool`, for the source being edited. */
export function tacticalMeters(
  game: Game, entry: TacticalEntry, source: string, before: GameState, pack: DataPack,
): { group: { load: number; capacity: number }; ships: number; fleet: number } {
  const state = structuredClone(before);
  const target = entry.systemId;
  const groups = target === null ? {} : moveUnits(game, state, target, entry.moves, pack, []);
  if (target !== null) landAndBuild(game, state, target, entry, pack, []);
  return {
    group: capacity(game, groups[source] ?? {}, before.upgrades, pack),
    ships: fleetCount(game, state.systems[target ?? ''] ?? {}, before.upgrades, pack),
    fleet: before.fleet,
  };
}

/** Where a tactical entry's production stands, as the replay places it: after the entry's own moves and landings. */
export function productionPlaces(game: Game, entry: TacticalEntry, before: GameState, pack: DataPack): ProductionPlace[] {
  const target = entry.systemId;
  if (target === null) return [];
  const state = structuredClone(before);
  moveUnits(game, state, target, entry.moves, pack, []);
  removeLosses(state, target, entry, []);
  landUnits(state, target, entry, []);
  return placesOf(game, state, target, entry.production, pack, entry.productionGround);
}
