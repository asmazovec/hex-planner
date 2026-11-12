/** Step 89.2 Movement: the route checks, and the ships carried into the active system. The route graph lives in src/domain/movement.ts. */
import { holderOf } from '../effects/registry';
import { blockersOf, closedToRoute, endsRoute, fullPath, routeMove, routeSteps, shipSpeed, type Blockers } from '../movement';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import { isLane, sourceSlot } from './board';
import { add, take, unitIds, type Move } from './state';

/**
 * Check, over the state before the move: what the routes of these ships cannot do by the rules (abilities and technologies
 * may still allow it). The whole path counts, the systems between the marked ones too (58.3.2). `blockers` are the systems
 * holding other players' ships; without them, what stands on the map by hand. Pickups are not routes (transport checks them).
 */
export function checkRoutes(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, blockers: Blockers = blockersOf(game, null, undefined, pack)): Warning[] {
  const warnings: Warning[] = [];
  for (const move of moves) {
    if (state.tokensOnMap.includes(move.from)) warnings.push(violation('sourceActivated', { from: move.from }));
    const full = fullPath(game, [move.from, ...(move.via ?? []), target], pack, blockers);
    const left = full.at(-1) === target ? full.slice(0, -1) : full;
    for (const slot of new Set(left.slice(1))) {
      if (closedToRoute(game, slot, pack) || endsRoute(game, slot, pack, blockers)) warnings.push(violation('routeBlocked', { from: move.from, systemId: slot }));
    }
    if (closedToRoute(game, target, pack)) warnings.push(violation('routeBlocked', { from: move.from, systemId: target }));
    // A hyperlane is no system: it cannot be the active system and no move ends there (44.2).
    if (isLane(game, target, pack)) warnings.push(violation('routeBlocked', { from: move.from, systemId: target, context: 'hyperlane' }));
    const steps = routeSteps(game, full, pack, blockers);
    for (const unit of unitIds(move.units)) {
      const speed = shipSpeed(game, unit, holderOf(game, state), pack);
      if (speed === null) continue;
      const moves = routeMove(game, left, speed, pack, blockers);
      if (moves < steps) warnings.push(violation('speedShort', { from: move.from, unit, move: moves, steps }));
    }
  }
  return warnings;
}

/**
 * Effect: carries the moves into the target and returns what each source system sent, by slot. What was entered is what
 * flies: a unit asked for that is not there is reported (`unitsMissing`) and flies all the same, since a warning forbids
 * nothing; its source only ends empty, never below. Pickups from the target's own planets stay in the system, so they
 * join no group.
 */
export function moveUnits(
  game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, warnings: Warning[],
): Record<string, UnitCounts> {
  const groups: Record<string, UnitCounts> = {};
  for (const move of moves) {
    take(move.from in pack.planets ? state.ground : state.systems, move.from, move.units, warnings);
    add(state.systems, target, move.units);
    const slot = move.pickupOf ?? sourceSlot(game, pack, move.from);
    if (slot !== null && slot !== target) add(groups, slot, move.units);
  }
  return groups;
}
