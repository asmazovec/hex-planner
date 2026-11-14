import { boardBefore, type Timeline, project as kernelProject } from '../../projection';
import type { Game, DataPack, Plan } from '../../../domain/types';
import type { Projection } from './types';
import { type Blockers, routeReach as reachOf } from '../../../domain/movement';
import { blockersOf } from './movement';

export { isOnMap, sourceSlot, systemPlanets, systemsAdjacent, systemSlots, tileIdOf, fleetSpeed, routeDistances, routeMove, routeSteps, shipSpeed, readyToPlay, productionCost, START_TOKENS, dockFighterRoom, fightersFly, pickupAllowed, systemMeters, isWaived, standing, type ProductionPlace } from '../../../domain/replay/index';
export { projectionOf, projectionAtRound, boardBefore, boardAfter, seenBefore, seenAfter, stateBeforeEntry, stateAfterEntry, boardBeforeEntry, timelineOf, forgetTimelines, tacticalNumbers, type Filter, type Frame, type Timeline } from '../../projection';
/** Test hook: told of every game a plan of which is projected (the oracle recorder registers one). Nothing watches in an ordinary run. */
export let projectWatcher: ((game: Game, pack: DataPack) => void) | undefined;
export const watchProjects = (next: typeof projectWatcher): void => { projectWatcher = next; };
export const project = (game: Game, plan: Plan, filter: Parameters<typeof kernelProject>[2], pack: DataPack): Projection => {
  projectWatcher?.(game, pack);
  return kernelProject(game, plan, filter, pack);
};
export const ownerOf = (plan: Plan, entryId: string): string | undefined =>
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
