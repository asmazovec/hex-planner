/**
 * The tactical action (LRR 89) as its steps, in order: 89.1 activation, 89.2 movement (with transport), 89.3 combat,
 * 89.4 invasion, 89.5 production and its payment, then the system's limits. Each step checks the state it is given, then
 * changes it; the steps themselves live in their own modules.
 */
import { checkStationLandings } from '../thundersEdge';
import type { DataPack, Game, GameState, Warning } from '../types';
import { checkAfterCombat, removeGroundLosses, removeLosses } from './combat';
import { gainControl, landUnits } from './invasion';
import { moveUnits } from './movement';
import { placesOf, type ProductionPlace } from './production';
import { type TacticalEntry } from './state';

/**
 * Steps 89.3 and 89.4 in the target after the moves: the battle's losses, the landing, the losses on the planets, then
 * control of the planets still held. What the surviving ships cannot carry is checked between the two (16.3.3).
 */
export function fightAndLand(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], lossesTaken = false,
  shared: GameState = state,
): void {
  if (!lossesTaken) removeLosses(state, target, entry, warnings);
  warnings.push(...checkAfterCombat(game, state, target, entry, pack));
  warnings.push(...checkStationLandings(entry, pack));
  const landedOn = landUnits(game, state, target, entry, pack, warnings, shared);
  removeGroundLosses(state, entry, warnings);
  gainControl(game, state, landedOn, pack);
}

/** A warning of the final check that the action already gave for the same system, at arrival or after the battle, is not repeated. */
export const fresh = (found: Warning[], given: Warning[]): Warning[] =>
  found.filter(w => !given.some(g => g.code === w.code && g.params.systemId === w.params.systemId));

/** Where a tactical entry's production stands, as the replay places it: after the entry's own moves and landings. */
export function productionPlaces(game: Game, entry: TacticalEntry, before: GameState, pack: DataPack): ProductionPlace[] {
  const target = entry.systemId;
  if (target === null) return [];
  const state = structuredClone(before);
  moveUnits(game, state, target, entry.moves, pack, []);
  fightAndLand(game, state, target, entry, pack, []);
  return placesOf(game, state, target, entry.production, pack, entry.productionGround);
}
