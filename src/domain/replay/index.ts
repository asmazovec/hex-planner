/**
 * The replay of a plan: rounds in order, each by its phases (LRR 40), each entry by its own steps. The state is never
 * stored: "now" replays the done entries, the forecast the done and planned ones. Opponents are counted the same way.
 */
import { blockersOf, routeReach as reachOf, type Blockers } from '../movement';
import { timeline, warningsOf, type Filter, type Timeline } from './timeline';
import type { DataPack, Game, GameState, Plan, Projection } from '../types';

export { timeline, type Filter, type Frame, type Timeline } from './timeline';
export { isOnMap, sourceSlot, systemPlanets, systemsAdjacent, systemSlots, tileIdOf } from './board';
export { fleetSpeed, routeDistances, routeMove, routeSteps, shipSpeed } from '../movement';
export { readyToPlay } from './holdings';
export { statusTokensFree } from './status';
export { readyInfluence, readyResources } from './payment';
export { placesOf, productionCost, productionDue, type ProductionPlace } from './production';
export { START_TOKENS } from './state';
export { planetStructureWarnings, structureOwner, structuresOn } from './structures';
export { fleetExcess, productionPlaces, tacticalMeters } from './tactical';
export { boardSystemWarnings, dockFighterRoom, fightersFly, fleetLimit, pickupAllowed, systemMeters } from './transport';
export { isWaived, standing } from '../rules/registry';
export { inForce } from '../effects/registry';

const ownerOf = (plan: Plan, entryId: string): string | undefined =>
  plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;
/** The board as its owner's entry sees it: the opponent's own state for an opponent's entry. */
const seenBy = (board: GameState, owner: string | undefined): GameState => (owner && board.rivals?.[owner]) || board;

/** Test hook: told of every game a plan of which is projected (the differential test of the game kernel registers one). Nothing watches in an ordinary run. */
let projectWatcher: ((game: Game, pack: DataPack) => void) | undefined;
export const watchProjects = (next: typeof projectWatcher): void => { projectWatcher = next; };

export const project = (game: Game, plan: Plan, filter: Filter, pack: DataPack): Projection => {
  projectWatcher?.(game, pack);
  return projectionOf(timeline(game, plan, filter, pack));
};

export const projectionOf = (line: Timeline): Projection => ({ state: line.end, warningsByEntry: warningsOf(line) });

/** The whole board just before an entry in a timeline; the end of the plan for an entry the replay never reached. */
export const boardBefore = (line: Timeline, entryId: string): GameState => line.byEntry.get(entryId)?.before ?? line.end;
export const boardAfter = (line: Timeline, entryId: string): GameState => line.byEntry.get(entryId)?.after ?? line.end;
export const seenBefore = (line: Timeline, entryId: string): GameState => seenBy(boardBefore(line, entryId), ownerOf(line.plan, entryId));
export const seenAfter = (line: Timeline, entryId: string): GameState => seenBy(boardAfter(line, entryId), ownerOf(line.plan, entryId));
/** The systems that end a route of an entry's owner just before it: the ships of everyone else as the timeline has them. */
export function blockersIn(line: Timeline, entryId: string): Blockers {
  const board = boardBefore(line, entryId);
  const owner = ownerOf(line.plan, entryId);
  return blockersOf(line.game, board, owner && board.rivals?.[owner] ? owner : undefined, line.pack);
}

/** The forecast right after an entry, without what comes later: the map between the repeats of its flight. */
export const stateAfterEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack): GameState =>
  seenAfter(timeline(game, plan, 'forecast', pack), entryId);

export const blockersBefore = (game: Game, plan: Plan, entryId: string, pack: DataPack): Blockers =>
  blockersIn(timeline(game, plan, 'forecast', pack), entryId);

/**
 * The systems a ship can still go to from the end of a path (see src/domain/movement.ts). Without `blockers`, the other
 * players' ships stand as at the end of the forecast of the active plan, as I see it.
 */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack, blockers?: Blockers): Set<string> {
  const plan = game.plans?.find(p => p.id === game.activePlanId);
  return reachOf(game, path, speed, active, pack, blockers ?? blockersOf(game, plan ? project(game, plan, 'forecast', pack).state : null, undefined, pack));
}

/** The state just before an entry applies: by default the forecast, what that entry can move and pay with. */
export const stateBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: Filter = 'forecast'): GameState =>
  seenBefore(timeline(game, plan, filter, pack), entryId);

/** The whole board just before an entry, mine and every opponent's (`rivals`), whoever the entry belongs to. */
export const boardBeforeEntry = (game: Game, plan: Plan, entryId: string, pack: DataPack, filter: Filter = 'forecast'): GameState =>
  boardBefore(timeline(game, plan, filter, pack), entryId);

const byRound = new WeakMap<Timeline, Map<number, Projection>>();
/**
 * The plan as far as the end of a round: its board, and the warnings of the entries replayed by then. Later rounds
 * would ready planets and clear its tokens. The same timeline and round give the same object back.
 */
export function projectionAtRound(line: Timeline, roundNo: number): Projection {
  let known = byRound.get(line);
  if (!known) byRound.set(line, (known = new Map()));
  let found = known.get(roundNo);
  if (!found) {
    const next = line.marks.findIndex(mark => mark.round.number > roundNo);
    const frames = next < 0 ? line.frames : line.frames.slice(0, next === 0 ? 0 : line.marks[next - 1].to);
    found = {
      state: next < 0 ? line.end : line.marks[next].start,
      warningsByEntry: Object.fromEntries(frames.filter(f => f.applied).map(f => [f.entryId, f.warnings])),
    };
    known.set(roundNo, found);
  }
  return found;
}
