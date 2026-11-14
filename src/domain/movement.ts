/**
 * Movement on the board (LRR 58, 6, 41, 44, 59, 11, 86): the route graph, anomalies, the whole path of a drawn route,
 * the speed of a ship and the systems it still reaches. Pure: the replay checks routes with it, the plan lights the reach.
 */
import { rotateLanes } from './lanes';
import { hasAnomaly, isLane, isOnMap, planetsOf, systemsAdjacent, systemSlots, tileAt, type MapSource } from './replay/board';
import { unitIds } from './replay/state';
import { gridDistance, oppositeEdge, slotAcross } from './route';
import { homeSlot, offMapHomes } from './strategy';
import { unitStats } from './unitStats';
import { applied } from './effects/apply';
import { effectOf, holderFor, holderOf, inForceOf, type Holder, type Who } from './effects/registry';
import './effects/points/movement';
import './effects/points/rivals';
import { noteBase } from './components';
import type { DataPack, UnitCounts, UnitId } from './types';
import type { TableFacts } from './facts';
import type { Moving, MoveShared } from './readers';

/** What a move is counted over: the map and the faction of the mover. */
export type Mover = MapSource & Pick<TableFacts, 'faction'>;

/** Two systems made adjacent beyond the board: a wormhole token, a law, an ability (6, 60.2). */
export type Link = readonly [string, string];

/**
 * What a count of movement knows besides the board: who moves, from where and with what, so that the components of
 * the mover answer (`speed`, `nebulaStart`, `gravityRift`). Every field is optional: without a holder the printed
 * numbers stand, which is what a drawing of the map asks.
 */
export interface MoveView {
  /** Whose components answer; the holdings of `state` and the faction of the game when only that is given. */
  holder?: Holder;
  /** The mover's state before the move, and my state, which holds the laws and the wormhole tokens. */
  state?: Moving;
  shared?: MoveShared;
  /** The start slot and the active system of the move. */
  from?: string;
  target?: string;
  /** The ship counted; none for a whole group (its fastest ship). */
  unit?: UnitId;
  /** The units moving together from the start. */
  group?: UnitCounts;
  /** The components the entry names (its uses and spends): their `modifyWhenNamed` holds. */
  named?: readonly string[];
  /** The systems made adjacent beyond the board (`linksOf`). */
  links?: readonly Link[];
  /** What the components read of the board, when the move is counted over the kernel's board rather than a per-player state. */
  at?: MoveAt;
}

/**
 * What a component of the mover reads of the board while a move is counted, whichever model the board is kept in: the
 * map (anomalies, adjacency, the Fracture), the slot of the mover's home, the wormhole tokens, and whether the mover has
 * a space dock in a system.
 */
export interface MoveAt {
  map: MapSource;
  readonly home: string | null;
  tokens?: Record<string, string>;
  dockIn(slot: string): boolean;
}

/** The same reads over the old per-player state (the route editor and the first replay). */
export const atOfState = (game: TableFacts, pack: DataPack, state: Moving, shared?: MoveShared): MoveAt => ({
  map: game, tokens: (shared ?? state).wormholeTokens,
  get home() { return homeSlot(game, pack); },
  dockIn: slot => planetsOf(game, slot, pack).some(planetId => state.docks.includes(planetId)),
});

const viewAt = (game: Pick<TableFacts, 'faction'>, pack: DataPack, view: MoveView | undefined): MoveAt | undefined =>
  view?.at ?? (view?.state ? atOfState(game as TableFacts, pack, view.state, view.shared) : undefined);

const viewHolder = (game: Pick<TableFacts, 'faction'>, view: MoveView | undefined): Holder | undefined =>
  view?.holder ?? (view?.state ? holderOf(game, view.state) : undefined);

/** The systems holding ships of players other than the one moving: a route may end there, never pass (58.3.2). */
export type Blockers = ReadonlySet<string>;

/**
 * Route graphs by what they are made of: the map, the Fracture, the pack and the factions at the table. The game as an
 * opponent plays it is a new object with the same map, so it shares the graph of the game.
 */
const routeGraphs = new WeakMap<MapSource['map'], WeakMap<MapSource['fracture'], WeakMap<DataPack, Map<string, Map<string, string[]>>>>>();

function graphSlot(game: MapSource, pack: DataPack): Map<string, Map<string, string[]>> {
  let byFracture = routeGraphs.get(game.map);
  if (!byFracture) routeGraphs.set(game.map, byFracture = new WeakMap());
  let byPack = byFracture.get(game.fracture);
  if (!byPack) byFracture.set(game.fracture, byPack = new WeakMap());
  let byFactions = byPack.get(pack);
  if (!byFactions) byPack.set(pack, byFactions = new Map());
  return byFactions;
}

const factionsKey = (game: MapSource): string => [game.faction, ...(game.opponents ?? []).map(o => o.faction)].sort().join(',');

/** The edges a line of this hyperlane leads to from one edge, or from any with none given. A tile whose lines the data lacks joins all its sides. */
function laneExits(game: MapSource, slot: string, entry: number | null, pack: DataPack): number[] {
  const known = tileAt(game, slot, pack)?.lanes;
  if (!known) return [0, 1, 2, 3, 4, 5].filter(edge => edge !== entry);
  const turns = Number((game.map[slot] ?? '').split('@')[1] ?? 0) % 6 || 0;
  const lanes = rotateLanes(known, turns);
  if (entry === null) return lanes.flat();
  return lanes.flatMap(([a, b]) => (a === entry ? [b] : b === entry ? [a] : []));
}

/** The systems at the far ends of the lines leaving a hyperlane, through any hyperlanes that follow it. */
function systemsAlongLanes(game: MapSource, slot: string, entry: number | null, pack: DataPack, seen = new Set<string>()): string[] {
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
function baseGraph(game: MapSource, pack: DataPack): Map<string, string[]> {
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

/** The graph with the extra adjacency laid over it; the cached one is never changed. */
function routeGraph(game: MapSource, pack: DataPack, links: readonly Link[] = []): Map<string, string[]> {
  const graph = baseGraph(game, pack);
  if (links.length === 0) return graph;
  const joined = new Map(graph);
  for (const [a, b] of links) {
    if (a === b) continue;
    if (!joined.get(a)?.includes(b)) joined.set(a, [...(joined.get(a) ?? []), b]);
    if (!joined.get(b)?.includes(a)) joined.set(b, [...(joined.get(b) ?? []), a]);
  }
  return joined;
}

/** Every slot a ship can be in: the map, the Fracture and an off-map home. */
export const boardSlots = (game: MapSource, pack: DataPack): string[] => [...systemSlots(game), ...offMapHomes(game, pack)];

/** The wormholes of a system: its tile's and the tokens put there (Creuss, Gamma Wormhole). */
export function wormholesOf(game: MapSource, pack: DataPack, slot: string, tokens: Record<string, string> | undefined = {}): string[] {
  const own = tileAt(game, slot, pack)?.wormholes ?? [];
  return [...new Set([...own, ...Object.entries(tokens).flatMap(([type, at]) => (at === slot ? [type] : []))])];
}

/** The systems holding a wormhole of this type, tokens included. */
export const wormholeSlots = (game: MapSource, pack: DataPack, type: string, tokens: Record<string, string> | undefined = {}): string[] =>
  boardSlots(game, pack).filter(slot => wormholesOf(game, pack, slot, tokens).includes(type));

/** Wormhole tokens join their system to every system with a matching wormhole (6.1). */
function tokenLinks(game: MapSource, pack: DataPack, tokens: Record<string, string> | undefined): Link[] {
  return Object.entries(tokens ?? {}).flatMap(([type, at]) => wormholeSlots(game, pack, type, tokens).filter(slot => slot !== at).map((slot): Link => [at, slot]));
}

/** Who asks for the adjacency beyond the board. */
export interface LinkWho { holder?: Holder; state?: Moving; shared?: MoveShared; named?: readonly string[]; during: 'tactical' | 'neighbors' }

/**
 * The adjacency the board does not draw: the wormhole tokens of the game and what the components of the player join
 * (in force, or named by the entry). Empty for a board that has none, so the cached graph is used as it is.
 */
export function linksOf(game: TableFacts, pack: DataPack, who: LinkWho): Link[] {
  const holder = who.holder ?? (who.state ? holderOf(game, who.state, who.shared) : undefined);
  return linksFrom(game, pack, {
    ...(holder ? { holder } : {}), faction: game.faction, controls: planetId => who.state?.control?.[planetId] === 'me',
    tokens: (who.shared ?? who.state)?.wormholeTokens, ...(who.named ? { named: who.named } : {}), during: who.during,
  });
}

/** Who asks for the adjacency beyond the board, from wherever the board is read. */
export interface LinkFrom { holder?: Holder; faction: string; controls: (planetId: string) => boolean; tokens?: Record<string, string>; named?: readonly string[]; during: 'tactical' | 'neighbors' }

/** The links, one implementation for the old state and the board. */
export function linksFrom(game: MapSource, pack: DataPack, who: LinkFrom): Link[] {
  const links = Object.keys(who.tokens ?? {}).length > 0 ? tokenLinks(game, pack, who.tokens) : [];
  const ids = [...(who.holder ? inForceOf(pack, who.holder, effect => effect.links !== undefined) : []), ...(who.named ?? []).filter(id => effectOf(pack, id)?.links)];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(noteBase(id))) continue;
    seen.add(noteBase(id));
    links.push(...(effectOf(pack, id)?.links?.({ game, pack, faction: who.faction, controls: who.controls, tokens: who.tokens, during: who.during }) ?? []));
  }
  return links;
}

/** A ship can neither enter nor pass: asteroids and a supernova. */
export const closedToRoute = (game: MapSource, slot: string, pack: DataPack): boolean =>
  hasAnomaly(game, slot, 'asteroid', pack) || hasAnomaly(game, slot, 'supernova', pack);

/** A ship can enter only to end its move, so only as the active system: a nebula, or a system holding other players' ships. */
export const endsRoute = (game: MapSource, slot: string, pack: DataPack, blockers: Blockers): boolean =>
  hasAnomaly(game, slot, 'nebula', pack) || blockers.has(slot);

export const holdsShips = (units: UnitCounts, pack: DataPack): boolean => unitIds(units).some(id => !pack.units[id]?.ground);

/** Steps from a system to every system joined to it, whatever stands in the way: this measures a route already drawn. */
export function routeDistances(game: MapSource, from: string, pack: DataPack, links?: readonly Link[]): Map<string, number> {
  const graph = routeGraph(game, pack, links);
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
export function fullPath(game: MapSource, path: string[], pack: DataPack, _blockers: Blockers = new Set()): string[] {
  void _blockers;
  return path.filter(slot => !isLane(game, slot, pack));
}

/** How many systems a whole path enters: one a step, a jump between systems that are not joined included. */
function stepsAlong(game: MapSource, full: string[], pack: DataPack): number {
  void game; void pack;
  return Math.max(0, full.length - 1);
}

/** The length of a drawn route: one step a marked system it enters, a jump included; a hyperlane takes no step. */
export function routeSteps(game: MapSource, path: string[], pack: DataPack, blockers: Blockers = new Set()): number {
  return stepsAlong(game, fullPath(game, path, pack, blockers), pack);
}

/** How far a ship of the player flies, after what they hold changed its printed move; null when it does not move by itself. */
export function shipSpeed(game: Pick<TableFacts, 'faction'>, unit: UnitId, holdings: Who, pack: DataPack, view?: MoveView): number | null {
  const printed = unitStats(game.faction, unit, false, pack)?.move ?? 0;
  const ctx = {
    faction: game.faction, unit,
    ...(view ? {
      from: view.from, systemId: view.target, group: view.group, pack, at: viewAt(game, pack, view),
      fastest: () => Math.max(0, ...unitIds(view.group ?? {}).flatMap(each => shipSpeed(game, each, holdings, pack) ?? [])),
    } : {}),
  };
  let { value } = applied(pack, viewHolder(game, view) ?? holderFor(holdings, game.faction), 'speed', printed, ctx);
  // What the entry names changes the move for it, once for each component however many copies it names.
  for (const id of new Set((view?.named ?? []).map(noteBase))) value = effectOf(pack, id)?.modifyWhenNamed?.speed?.(value, ctx) ?? value;
  return value > 0 ? value : null;
}

/** How far the fastest ship among these units flies; null without a ship that flies by itself. */
export function fleetSpeed(game: Mover, units: UnitCounts, holdings: Who, pack: DataPack, view?: MoveView): number | null {
  const speeds = unitIds(units).flatMap(id => shipSpeed(game, id, holdings, pack, view && { ...view, group: view.group ?? units }) ?? []);
  return speeds.length > 0 ? Math.max(...speeds) : null;
}

/** The gravity rifts a whole path leaves: each rift and each time adds 1 (41.3, note 6); a system with two rifts is one (41.4). */
const riftsIn = (game: Mover, full: string[], pack: DataPack, view?: MoveView): number => full.filter(slot => isRift(game, slot, pack, view)).length;

/** Whether a system is a gravity rift for the mover: a rift tile, or what a component of theirs makes one (41.1). */
function isRift(game: Mover, slot: string, pack: DataPack, view?: MoveView): boolean {
  const base = hasAnomaly(game, slot, 'rift', pack) ? 1 : 0;
  const holder = viewHolder(game, view);
  return (holder ? applied(pack, holder, 'gravityRift', base, { faction: game.faction, systemId: slot, pack, at: viewAt(game, pack, view) }).value : base) > 0;
}

/** The move value of a ship that starts in a nebula: 1, unless a component of the mover says otherwise (59.2). */
function nebulaSpeed(game: Mover, from: string, speed: number, pack: DataPack, view?: MoveView): number {
  const holder = viewHolder(game, view);
  if (!holder) return 1;
  const ask = (unit: UnitId | undefined, own: number): number =>
    applied(pack, holder, 'nebulaStart', 1, { faction: game.faction, unit, speed: own, from, pack }).value;
  if (view?.unit !== undefined || !view?.group) return ask(view?.unit, speed);
  return Math.max(...unitIds(view.group).flatMap(unit => { const own = shipSpeed(game, unit, holder.holdings, pack, { ...view, unit }); return own === null ? [] : [ask(unit, own)]; }), 1);
}

/**
 * A ship's speed having left these systems, the first its start: a start in a nebula makes it 1 (`nebulaStart`),
 * each gravity rift left adds 1 (`gravityRift`).
 */
export function routeMove(game: Mover, left: string[], speed: number, pack: DataPack, blockers: Blockers = new Set(), view?: MoveView): number {
  const full = fullPath(game, left, pack, blockers);
  return (hasAnomaly(game, full[0], 'nebula', pack) ? nebulaSpeed(game, full[0], speed, pack, view) : speed) + riftsIn(game, full, pack, view);
}

/**
 * The systems a ship can still go to from the end of a path, by the rules for anomalies, other players' ships and speed.
 * The active system stays among them although the path has passed it: a ship may leave it and come back (58.3.5).
 */
export function routeReach(game: Mover, path: string[], speed: number, active: string, pack: DataPack, blockers: Blockers, view?: MoveView): Set<string> {
  const graph = routeGraph(game, pack, view?.links);
  const full = fullPath(game, path, pack, blockers);
  const reached = new Set<string>();
  // What is left of the move on arriving in a system; a rift entered on the way gives its 1 as the ship goes on out of it.
  const queue = [{ slot: full.at(-1)!, left: routeMove(game, full, speed, pack, blockers, view) - stepsAlong(game, full, pack) }];
  const best = new Map<string, number>();
  for (let i = 0; i < queue.length; i += 1) {
    const { slot, left } = queue[i];
    if (left < 1) continue;
    for (const next of graph.get(slot) ?? []) {
      if (closedToRoute(game, next, pack) || (endsRoute(game, next, pack, blockers) && next !== active)) continue;
      reached.add(next);
      if (next === active) continue;
      const after = left - 1 + (isRift(game, next, pack, view) ? 1 : 0);
      if ((best.get(next) ?? -Infinity) >= after) continue;
      best.set(next, after);
      queue.push({ slot: next, left: after });
    }
  }
  for (const slot of path) if (slot !== active) reached.delete(slot);
  return reached;
}

/** The systems one step from a system, by the board and the extra adjacency; the system itself is not one. */
export const adjacentTo = (game: MapSource, slot: string, pack: DataPack, links?: readonly Link[]): string[] =>
  [...routeDistances(game, slot, pack, links)].flatMap(([other, steps]) => (steps === 1 ? [other] : []));

/** Whether two systems are adjacent: by a side, a wormhole, a hyperlane's line, or a link. */
export const joined = (game: MapSource, a: string, b: string, pack: DataPack, links?: readonly Link[]): boolean =>
  (routeDistances(game, a, pack, links).get(b) ?? Infinity) === 1;
