/** Step 89.2 Movement: the route checks, and the ships carried into the active system. The route graph lives in src/domain/movement.ts. */
import { holderOf, type Holder } from '../effects/registry';
import { playedBy } from '../effects/waivers';
import { blockersOf, closedToRoute, endsRoute, fullPath, linksOf, routeMove, routeSteps, shipSpeed, type Blockers, type MoveView } from '../movement';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../types';
import { isLane, sourceSlot, type MapSource } from './board';
import { add, take, unitIds, type Move, type TacticalEntry } from './state';
import { isPickup } from './transport';

/** What a route check knows of the entry beyond the board: my state (laws, tokens) and the components the entry names. */
export interface RouteWho { shared?: GameState; named?: readonly string[]; links?: MoveView['links'] }

/** What the components of the mover are told of one ship's move: where it starts, where it goes, who moves with it. */
export const moveViewOf = (game: Game, state: GameState, move: Move, target: string, who: RouteWho, unit?: UnitId): MoveView => ({
  holder: holderOf(game, state, who.shared), state, shared: who.shared, from: move.from, target, unit, group: move.units, named: who.named, links: who.links,
});

/**
 * The route warnings of a tactical entry as the replay makes them: over my state `shared` (laws, tokens), with the
 * components the entry names and the adjacency they and the tokens make. The replay and the waivers' helpers ask this.
 */
export function checkEntryRoutes(game: Game, state: GameState, shared: GameState | undefined, entry: TacticalEntry, pack: DataPack, blockers?: Blockers): Warning[] {
  const target = entry.systemId;
  if (target === null) return [];
  const named = playedBy(entry);
  const links = linksOf(game, pack, { state, shared, named, during: 'tactical' });
  return checkRoutes(game, state, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack, blockers, { shared, named, links });
}

/** What a route check reads of the mover besides the map: whether their command token lies in a system, whose components answer, and the view of one ship's move they are asked with. */
export interface RouteReads {
  tokenAt(slot: string): boolean;
  holder: Holder;
  view(move: Move, unit?: UnitId): MoveView;
}

/** The route warnings of a tactical entry over what a board says of the mover: the same checks, one implementation. */
export function checkEntryRoutesOf(game: MapSource & Pick<Game, 'faction'>, reads: RouteReads, entry: TacticalEntry, pack: DataPack, blockers: Blockers): Warning[] {
  const target = entry.systemId;
  if (target === null) return [];
  return checkRoutesOf(game, reads, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack, blockers);
}

/**
 * Check, over the state before the move: what the routes of these ships cannot do by the rules (abilities and technologies
 * may still allow it). The whole path counts, the systems between the marked ones too (58.3.2). `blockers` are the systems
 * holding other players' ships; without them, what stands on the map by hand. Pickups are not routes (transport checks them).
 */
export function checkRoutes(
  game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, blockers: Blockers = blockersOf(game, null, undefined, pack), who: RouteWho = {},
): Warning[] {
  const reads: RouteReads = {
    tokenAt: slot => state.tokensOnMap.includes(slot), holder: holderOf(game, state, who.shared), view: (move, unit) => moveViewOf(game, state, move, target, who, unit),
  };
  return checkRoutesOf(game, reads, target, moves, pack, blockers);
}

export function checkRoutesOf(
  game: MapSource & Pick<Game, 'faction'>, reads: RouteReads, target: string, moves: Move[], pack: DataPack, blockers: Blockers,
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
