/** Step 89.2 Movement: the route graph, anomalies and speed, the route checks, and the ships carried into the active system. */
import { rotateLanes } from '../lanes';
import { violation } from '../rules/registry';
import { gridDistance, oppositeEdge, slotAcross } from '../route';
import { unitStats } from '../unitStats';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../types';
import { hasAnomaly, isLane, isOnMap, sourceSlot, systemsAdjacent, systemSlots, tileAt } from './board';
import { add, take, unitIds, type Move } from './state';

// TODO(P2-006) #ws:movement #type:arch #size:m #srp #route-graph — Граф маршрутов и аномалии (180 строк) живут в модуле расчёта состояния: вынести в src/domain/movement.ts
const routeGraphs = new WeakMap<Game, Map<string, string[]>>();

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

/** What a ship can step to from each system: its neighbours, those a hyperlane's line joins it to, and those sharing a wormhole with it. */
function routeGraph(game: Game, pack: DataPack): Map<string, string[]> {
  const known = routeGraphs.get(game);
  if (known) return known;
  const slots = systemSlots(game);
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
  routeGraphs.set(game, graph);
  return graph;
}

/** A ship can neither enter nor pass: asteroids and a supernova. */
// TODO(P2-012) #ws:movement #type:check #rule:44.2 #test:044-hyperlanes #size:s #hyperlane — Гиперпуть не система: его нельзя выбрать активной системой и в нём нельзя закончить ход — нет нарушения
const closedToRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'asteroid', pack) || hasAnomaly(game, slot, 'supernova', pack);

/** A ship can enter only to end its move, so only as the active system: a nebula, or a system holding other players' ships. */
// TODO(P2-043) #ws:rivals #type:bug #rule:58.3.2 #test:058-movement #size:l #rivals #route — Блокировка берётся из game.enemyUnits (расставлено вручную), а не из состояния соперников при повторе: приведённые соперником корабли не мешают, уведённые мешают; маршруты соперника не видят моих кораблей
const endsRoute = (game: Game, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'nebula', pack)
  || Object.values(game.enemyUnits[slot] ?? {}).some(units => unitIds(units).some(id => !pack.units[id]?.ground));

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

/** The length of a drawn route: a hyperlane is no system and takes no step. Two systems no way joins, over holes of a map not finished or into the Fracture, count by the grid. */
// TODO(P2-008) #ws:movement #type:bug #rule:58.3.2 #test:058-movement #size:m #route #skipped-stop — Шаги между отмеченными точками считаются поиском, который не видит аномалий и чужих кораблей: системы между точками не проверяются. Восстанавливать весь путь или требовать соседние точки (tapStep)
export function routeSteps(game: Game, path: string[], pack: DataPack): number {
  const stops = path.filter(slot => !isLane(game, slot, pack));
  return stops.slice(1).reduce((sum, slot, i) => sum + (routeDistances(game, stops[i], pack).get(slot) ?? gridDistance(stops[i], slot)), 0);
}

export const shipSpeed = (game: Game, unit: UnitId, upgrades: UnitId[], pack: DataPack): number | null =>
  unitStats(game.faction, unit, upgrades.includes(unit), pack)?.move ?? null;

/** How far the fastest ship among these units flies; null without a ship that flies by itself. */
export function fleetSpeed(game: Game, units: UnitCounts, upgrades: UnitId[], pack: DataPack): number | null {
  const speeds = unitIds(units).flatMap(id => shipSpeed(game, id, upgrades, pack) ?? []);
  return speeds.length > 0 ? Math.max(...speeds) : null;
}

/** A ship's speed having left these systems, the first its start: a start in a nebula makes it 1, a gravity rift adds 1, once a ship. */
// TODO(P2-007) #ws:movement #type:bug #rule:41.3 #rule:41-note-6 #test:041-gravity-rift #size:s #gravity-rift — Разлом даёт +1 один раз на корабль; по примечанию 6 к 41 — +1 за каждый разлом и каждое прохождение. Ключ seen в routeReach тоже булев
export function routeMove(game: Game, left: string[], speed: number, pack: DataPack): number {
  const start = hasAnomaly(game, left[0], 'nebula', pack) ? 1 : speed;
  return start + (left.some(slot => hasAnomaly(game, slot, 'rift', pack)) ? 1 : 0);
}

/** The systems a ship can still go to from the end of a path, by the rules for anomalies, other players' ships and speed. */
export function routeReach(game: Game, path: string[], speed: number, active: string, pack: DataPack): Set<string> {
  const graph = routeGraph(game, pack);
  const reached = new Set<string>();
  const start = { slot: path.at(-1)!, steps: routeSteps(game, path, pack), left: path };
  const queue = [start];
  const seen = new Map<string, number>();
  for (let i = 0; i < queue.length; i += 1) {
    const { slot, steps, left } = queue[i];
    if (steps >= routeMove(game, left, speed, pack)) continue;
    for (const next of graph.get(slot) ?? []) {
      if (closedToRoute(game, next, pack) || (endsRoute(game, next, pack) && next !== active)) continue;
      reached.add(next);
      if (next === active) continue;
      // Having passed a rift is what can change later, so a system is looked at again only with that gained.
      const passed = [...left, next];
      const key = `${next}:${passed.some(s => hasAnomaly(game, s, 'rift', pack))}`;
      if ((seen.get(key) ?? Infinity) <= steps + 1) continue;
      seen.set(key, steps + 1);
      queue.push({ slot: next, steps: steps + 1, left: passed });
    }
  }
  // TODO(P2-009) #ws:movement #type:bug #rule:58.3.5 #test:058-movement #size:s #route-highlight — Удаляет из подсветки и активную систему, если путь начался в ней: 58.3.5 разрешает вылететь и вернуться
  for (const slot of path) reached.delete(slot);
  return reached;
}

/**
 * Check, over the state before the move: what the routes of these ships cannot do by the rules (abilities and technologies
 * may still allow it). Pickups are not routes and are left out by the caller (transport).
 */
export function checkRoutes(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack): Warning[] {
  const warnings: Warning[] = [];
  for (const move of moves) {
    if (state.tokensOnMap.includes(move.from)) warnings.push(violation('sourceActivated', { from: move.from }));
    const via = move.via ?? [];
    for (const slot of via) {
      if (closedToRoute(game, slot, pack) || endsRoute(game, slot, pack)) warnings.push(violation('routeBlocked', { from: move.from, systemId: slot }));
    }
    if (closedToRoute(game, target, pack)) warnings.push(violation('routeBlocked', { from: move.from, systemId: target }));
    const left = [move.from, ...via];
    const steps = routeSteps(game, [...left, target], pack);
    for (const unit of unitIds(move.units)) {
      const speed = shipSpeed(game, unit, state.upgrades, pack);
      if (speed === null) continue;
      const moves = routeMove(game, left, speed, pack);
      if (moves < steps) warnings.push(violation('speedShort', { from: move.from, unit, move: moves, steps }));
    }
  }
  return warnings;
}

/**
 * Effect: carries the moves into the target and returns what each source system really sent, by slot; a unit asked for
 * that is not there is reported. Pickups from the target's own planets stay in the system, so they join no group.
 */
export function moveUnits(
  game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, warnings: Warning[],
): Record<string, UnitCounts> {
  const groups: Record<string, UnitCounts> = {};
  for (const move of moves) {
    const taken = take(move.from in pack.planets ? state.ground : state.systems, move.from, move.units, warnings);
    add(state.systems, target, taken);
    const slot = move.pickupOf ?? sourceSlot(game, pack, move.from);
    if (slot !== null && slot !== target) add(groups, slot, taken);
  }
  return groups;
}
