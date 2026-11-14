/** Step 89.2 Movement: the route checks, and the ships carried into the active system. The route graph lives in src/domain/movement.ts. */
import { type Holder } from '../effects/registry';
import { closedToRoute, endsRoute, fullPath, routeMove, routeSteps, shipSpeed, type Blockers, type MoveView } from '../movement';
import { violation } from '../rules/registry';
import type { DataPack, UnitId, Warning } from '../types';
import type { TableFacts } from '../facts';
import { isLane, type MapSource } from './board';
import { unitIds, type Move, type TacticalEntry } from './state';
import { isPickup } from './transport';

/** What a route check reads of the mover besides the map: whether their command token lies in a system, whose components answer, and the view of one ship's move they are asked with. */
export interface RouteReads {
  tokenAt(slot: string): boolean;
  holder: Holder;
  view(move: Move, unit?: UnitId): MoveView;
}

/** The route warnings of a tactical entry over what a board says of the mover: the same checks, one implementation. */
export function checkEntryRoutesOf(game: MapSource & Pick<TableFacts, 'faction'>, reads: RouteReads, entry: TacticalEntry, pack: DataPack, blockers: Blockers): Warning[] {
  const target = entry.systemId;
  if (target === null) return [];
  return checkRoutesOf(game, reads, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack, blockers);
}

export function checkRoutesOf(
  game: MapSource & Pick<TableFacts, 'faction'>, reads: RouteReads, target: string, moves: Move[], pack: DataPack, blockers: Blockers,
): Warning[] {
  const warnings: Warning[] = [];
  for (const move of moves) {
    if (reads.tokenAt(move.from)) warnings.push(violation('sourceActivated', { from: move.from }));
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
      const view = reads.view(move, unit);
      const speed = shipSpeed(game, unit, reads.holder, pack, view);
      if (speed === null) continue;
      const moves = routeMove(game, left, speed, pack, blockers, view);
      if (moves < steps) warnings.push(violation('speedShort', { from: move.from, unit, move: moves, steps }));
    }
  }
  return warnings;
}
