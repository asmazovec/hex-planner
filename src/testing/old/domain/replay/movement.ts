import type { DataPack, Game, UnitCounts, Warning, UnitId } from '../../../../domain/types';
import type { GameState } from '../types';
import { sourceSlot } from '../../../../domain/replay/board';
import { add, take, type Move, type TacticalEntry } from '../../../../domain/replay/state';
import { type MoveView, type Blockers, linksOf } from '../../../../domain/movement';
import { holderOf } from '../../../../domain/effects/registry';
import { playedBy } from '../../../../domain/effects/waivers';
import { isPickup } from '../../../../domain/replay/transport';
import { blockersOf } from '../movement';
import { type RouteReads, checkRoutesOf } from '../../../../domain/replay/movement';
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
