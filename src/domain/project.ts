/**
 * The calculation of a game's state, as the domain and its tests ask for it. The state is computed by the game kernel
 * (src/game, entered through src/state/projection.ts): there is one implementation. What does not compute a state (the
 * measures of a board, the costs of production, the routes) is re-exported from src/domain/replay/ as before. The old
 * old replay is gone: its last record is the frozen oracle of src/game/resolve (oracle.test.ts, recorded by record.test.ts).
 */
import { blockersOf, routeReach as reachOf, type Blockers } from './movement';
import { boardBefore, project as kernelProject, type Timeline } from '../testing/projection';
import type { DataPack, Game, Plan, Projection } from './types';

export {
  isOnMap, sourceSlot, systemPlanets, systemsAdjacent, systemSlots, tileIdOf, fleetSpeed, routeDistances, routeMove, routeSteps, shipSpeed,
  readyToPlay, statusTokensFree, readyInfluence, readyResources, placesOf, productionCost, productionDue, START_TOKENS,
  planetStructureWarnings, structureOwner, structuresOn, productionPlaces,
  boardSystemWarnings, dockFighterRoom, fightersFly, fleetLimit, pickupAllowed, systemMeters, isWaived, standing, inForce,
  type ProductionPlace,
} from './replay';
export {
  projectionOf, projectionAtRound, boardBefore, boardAfter, seenBefore, seenAfter, stateBeforeEntry, stateAfterEntry, boardBeforeEntry,
  timelineOf, forgetTimelines, tacticalNumbers, type Filter, type Frame, type Timeline,
} from '../testing/projection';

/** Test hook: told of every game a plan of which is projected (the oracle recorder registers one). Nothing watches in an ordinary run. */
let projectWatcher: ((game: Game, pack: DataPack) => void) | undefined;
export const watchProjects = (next: typeof projectWatcher): void => { projectWatcher = next; };

export const project = (game: Game, plan: Plan, filter: Parameters<typeof kernelProject>[2], pack: DataPack): Projection => {
  projectWatcher?.(game, pack);
  return kernelProject(game, plan, filter, pack);
};

const ownerOf = (plan: Plan, entryId: string): string | undefined =>
  plan.rounds.flatMap(r => r.entries).find(e => e.id === entryId)?.owner;

/** The systems that end a route of an entry's owner just before it: the ships of everyone else as the timeline has them. */
export function blockersIn(line: Timeline, entryId: string): Blockers {
  const board = boardBefore(line, entryId);
  const owner = ownerOf(line.plan, entryId);
  return blockersOf(line.game, board, owner && board.rivals?.[owner] ? owner : undefined, line.pack);
}

/** The systems a ship can still go to from the end of a path (see src/domain/movement.ts); the other ships stand as at the end of the forecast of the active plan. */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack, blockers?: Blockers): Set<string> {
  const plan = game.plans?.find(p => p.id === game.activePlanId);
  return reachOf(game, path, speed, active, pack, blockers ?? blockersOf(game, plan ? kernelProject(game, plan, 'forecast', pack).state : null, undefined, pack));
}
