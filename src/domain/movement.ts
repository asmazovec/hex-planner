/**
 * Movement on the board (LRR 58, 6, 41, 44, 59, 11, 86): the route graph, anomalies, the whole path of a drawn route,
 * the speed of a ship and the systems it still reaches. Pure: the replay checks routes with it, the plan lights the reach.
 */
import { rotateLanes } from './lanes';
import { hasAnomaly, isLane, isOnMap, systemsAdjacent, systemSlots, tileAt } from './replay/board';
import { unitIds } from './replay/state';
import { gridDistance, oppositeEdge, slotAcross } from './route';
import { offMapHomes } from './strategy';
import { unitStats } from './unitStats';
import { applied } from './effects/apply';
import { holderFor, type Who } from './effects/registry';
import type { DataPack, Game, GameState, UnitCounts, UnitId } from './types';

/** The systems holding ships of players other than the one moving: a route may end there, never pass (58.3.2). */
export type Blockers = ReadonlySet<string>;

/**
 * Route graphs by what they are made of: the map, the Fracture, the pack and the factions at the table. The game as an
 * opponent plays it (`gameAs`) is a new object with the same map, so it shares the graph of the game.
 */
const routeGraphs = new WeakMap<Game['map'], WeakMap<Game['fracture'], WeakMap<DataPack, Map<string, Map<string, string[]>>>>>();

function graphSlot(game: Game, pack: DataPack): Map<string, Map<string, string[]>> {
  let byFracture = routeGraphs.get(game.map);
  if (!byFracture) routeGraphs.set(game.map, byFracture = new WeakMap());
  let byPack = byFracture.get(game.fracture);
  if (!byPack) byFracture.set(game.fracture, byPack = new WeakMap());
  let byFactions = byPack.get(pack);
  if (!byFactions) byPack.set(pack, byFactions = new Map());
  return byFactions;
}

const factionsKey = (game: Game): string => [game.faction, ...(game.opponents ?? []).map(o => o.faction)].sort().join(',');

/** The edges a line of this hyperlane leads to from one edge, or from any with none given. A tile whose lines the data lacks joins all its sides. */
function laneExits(game: Game, slot: string, entry: number | null, pack: DataPack): number[] {
  const known = tileAt(game, slot, pack)?.lanes;
  if (!known) return [0, 1, 2, 3, 4, 5].filter(edge => edge !== entry);
  const turns = Number((game.map[slot] ?? '').split('@')[1] ?? 0) % 6 || 0;
  const lanes = rotateLanes(known, turns);
  if (entry === null) return lanes.flat();
  return lanes.flatMap(([a, b]) => (a === entry ? [b] : b === entry ? [a] : []));
}

/** The systems at the far ends of the lines leaving a hyperlane, through any hyperlanes that follow it. */
function systemsAlongLanes(game: Game, slot: string, entry: number | null, pack: DataPack, seen = new Set<string>()): string[] {
  return laneExits(game, slot, entry, pack).flatMap(edge => {
    const next = slotAcross(slot, edge);
    if (next === null || !isOnMap(game, next)) return [];
    if (!isLane(game, next, pack)) return [next];
    const arrival = `${next}:${oppositeEdge(edge)}`;
    if (seen.has(arrival)) return [];
    seen.add(arrival);
    return systemsAlongLanes(game, next, oppositeEdge(edge), pack, seen);
  });
}

/**
 * What a ship can step to from each system: its neighbours, those a hyperlane's line joins it to, and those sharing a
 * wormhole with it. An off-map home (the Creuss home, 6 note 2) is a system under its tile id, joined by its wormhole alone.
 */
function routeGraph(game: Game, pack: DataPack): Map<string, string[]> {
  const cache = graphSlot(game, pack);
  const key = factionsKey(game);
  const known = cache.get(key);
  if (known) return known;
  const slots = [...systemSlots(game), ...offMapHomes(game, pack)];
  const adjacent = systemsAdjacent(game, pack);
  const holes = (slot: string) => tileAt(game, slot, pack)?.wormholes ?? [];
  const stepsOf = (slot: string): string[] => {
    if (isLane(game, slot, pack)) return systemsAlongLanes(game, slot, null, pack);
    const across = [0, 1, 2, 3, 4, 5].flatMap(edge => {
      const next = slotAcross(slot, edge);
      if (next === null || !isOnMap(game, next) || !adjacent(slot, next)) return [];
      return isLane(game, next, pack) ? systemsAlongLanes(game, next, oppositeEdge(edge), pack) : [next];
    });
    return [...across, ...slots.filter(other => holes(slot).some(hole => holes(other).includes(hole)) || (gridDistance(slot, other) > 1 && adjacent(slot, other)))];
  };
  const graph = new Map(slots.map(slot => [slot, [...new Set(stepsOf(slot))].filter(other => other !== slot)]));
  cache.set(key, graph);
  return graph;
}

/** A ship can neither enter nor pass: asteroids and a supernova. */
export const closedToRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'asteroid', pack) || hasAnomaly(game, slot, 'supernova', pack);

/** A ship can enter only to end its move, so only as the active system: a nebula, or a system holding other players' ships. */
export const endsRoute = (game: Game, slot: string, pack: DataPack, blockers: Blockers): boolean =>
  hasAnomaly(game, slot, 'nebula', pack) || blockers.has(slot);

const holdsShips = (units: UnitCounts, pack: DataPack): boolean => unitIds(units).some(id => !pack.units[id]?.ground);

/**
 * The systems that end a route of `mover` (undefined or `me` for me): the ships of every other player. Over the replayed
 * state (mine, with the opponents' in `rivals`) when there is one; what stands on the map by hand for anyone it does not count.
 */
export function blockersOf(game: Game, state: Pick<GameState, 'systems' | 'rivals'> | null, mover: string | undefined, pack: DataPack): Set<string> {
  const me = mover === undefined || mover === 'me';
  const rivals = state?.rivals ?? {};
  const blockers = new Set<string>();
  const addShips = (systems: Record<string, UnitCounts>) => {
    for (const [slot, units] of Object.entries(systems)) if (holdsShips(units, pack)) blockers.add(slot);
  };
  if (!me && state) addShips(state.systems);
  for (const [id, rival] of Object.entries(rivals)) if (id !== mover) addShips(rival.systems);
  for (const [slot, byOwner] of Object.entries(game.enemyUnits)) {
    for (const [owner, units] of Object.entries(byOwner)) {
      if (owner !== mover && !(owner in rivals) && holdsShips(units, pack)) blockers.add(slot);
    }
  }
  return blockers;
}

/** Steps from a system to every system joined to it, whatever stands in the way: this measures a route already drawn. */
export function routeDistances(game: Game, from: string, pack: DataPack): Map<string, number> {
  const graph = routeGraph(game, pack);
  const steps = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    for (const next of graph.get(queue[i]) ?? []) {
      if (steps.has(next)) continue;
      steps.set(next, steps.get(queue[i])! + 1);
      queue.push(next);
    }
  }
  return steps;
}

/**
 * The systems a drawn route enters, in order (58.3.2): a hyperlane is no system and drops out. Two marked systems that
 * are not joined (neighbours, a wormhole, a hyperlane's line) are a jump: the player marks a move the board does not
 * give, through the Fracture, a portal or an ability the rules here do not count, so nothing in between is entered.
 */
export function fullPath(game: Game, path: string[], pack: DataPack, _blockers: Blockers = new Set()): string[] {
  void _blockers;
  return path.filter(slot => !isLane(game, slot, pack));
}

/** How many systems a whole path enters: one a step, a jump between systems that are not joined included. */
function stepsAlong(game: Game, full: string[], pack: DataPack): number {
  void game; void pack;
  return Math.max(0, full.length - 1);
}

/** The length of a drawn route: one step a marked system it enters, a jump included; a hyperlane takes no step. */
export function routeSteps(game: Game, path: string[], pack: DataPack, blockers: Blockers = new Set()): number {
  return stepsAlong(game, fullPath(game, path, pack, blockers), pack);
}

/** How far a ship of the player flies, after what they hold changed its printed move; null when it does not move by itself. */
export function shipSpeed(game: Game, unit: UnitId, holdings: Who, pack: DataPack): number | null {
  const printed = unitStats(game.faction, unit, false, pack)?.move ?? 0;
  const { value } = applied(pack, holderFor(holdings, game.faction), 'speed', printed, { faction: game.faction, unit });
  return value > 0 ? value : null;
}

/** How far the fastest ship among these units flies; null without a ship that flies by itself. */
export function fleetSpeed(game: Game, units: UnitCounts, holdings: Who, pack: DataPack): number | null {
  const speeds = unitIds(units).flatMap(id => shipSpeed(game, id, holdings, pack) ?? []);
  return speeds.length > 0 ? Math.max(...speeds) : null;
}

/** The gravity rifts a whole path leaves: each rift and each time adds 1 (41.3, note 6); a system with two rifts is one (41.4). */
const riftsIn = (game: Game, full: string[], pack: DataPack): number => full.filter(slot => hasAnomaly(game, slot, 'rift', pack)).length;

/** A ship's speed having left these systems, the first its start: a start in a nebula makes it 1, each gravity rift left adds 1. */
export function routeMove(game: Game, left: string[], speed: number, pack: DataPack, blockers: Blockers = new Set()): number {
  const full = fullPath(game, left, pack, blockers);
  return (hasAnomaly(game, full[0], 'nebula', pack) ? 1 : speed) + riftsIn(game, full, pack);
}

/**
 * The systems a ship can still go to from the end of a path, by the rules for anomalies, other players' ships and speed.
 * The active system stays among them although the path has passed it: a ship may leave it and come back (58.3.5).
 */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack, blockers: Blockers): Set<string> {
  const graph = routeGraph(game, pack);
  const full = fullPath(game, path, pack, blockers);
  const reached = new Set<string>();
  // What is left of the move on arriving in a system; a rift entered on the way gives its 1 as the ship goes on out of it.
  const queue = [{ slot: full.at(-1)!, left: routeMove(game, full, speed, pack, blockers) - stepsAlong(game, full, pack) }];
  const best = new Map<string, number>();
  for (let i = 0; i < queue.length; i += 1) {
    const { slot, left } = queue[i];
    if (left < 1) continue;
    for (const next of graph.get(slot) ?? []) {
      if (closedToRoute(game, next, pack) || (endsRoute(game, next, pack, blockers) && next !== active)) continue;
      reached.add(next);
      if (next === active) continue;
      const after = left - 1 + (hasAnomaly(game, next, 'rift', pack) ? 1 : 0);
      if ((best.get(next) ?? -Infinity) >= after) continue;
      best.set(next, after);
      queue.push({ slot: next, left: after });
    }
  }
  for (const slot of path) if (slot !== active) reached.delete(slot);
  return reached;
}
