/**
 * The map as the kernel asks it: what a ship can step to from a system, how far a route reaches, which systems end a
 * route. The graph and the counting are those of `src/domain/movement.ts` (one implementation, over a neutral
 * `MapSource`); this file only gives them a table and a board. Other players' ships come from `board.systems`.
 */
import {
  adjacentTo, boardSlots, closedToRoute, endsRoute, fullPath, holdsShips, joined, passageBarredOf, routeDistances, routeReach, routeSteps,
  type Blockers, type Link, type MoveView,
} from '../domain/movement';
import { planetsOf as planetsOfSystem, tileAt, type MapSource } from '../domain/replay/board';
import type { DataPack } from '../domain/types';
import { legacyViews, SOURCES } from './legacyViews';
import type { Board, PlayerId, Slot, Table } from './types';

const sources = new WeakMap<Table, WeakMap<Board['common']['fracture'], MapSource>>();

/** The table's map and the Fracture of the board, as the movement code reads them. Memoized: the route graph is cached by it. */
export function mapSource(table: Table, board: Board): MapSource {
  let byFracture = sources.get(table);
  if (!byFracture) sources.set(table, byFracture = new WeakMap());
  let found = byFracture.get(board.common.fracture);
  if (!found) {
    const origin = SOURCES.get(table);
    const viewer = table.players.find(p => p.id === table.viewer);
    found = {
      map: table.map,
      fracture: { ...(origin?.fracture ?? { active: false, ingress: [], seat: null }), ...(board.common.fracture.open ? { tiles: board.common.fracture.tiles } : {}) },
      faction: viewer?.faction ?? '',
      opponents: table.players.filter(p => p.id !== table.viewer).map(p => ({ id: p.id, faction: p.faction, vp: 0, seat: p.seat, color: p.color })),
      expedition: { slices: {}, thundersEdgeSystem: origin?.expedition.thundersEdgeSystem ?? null },
    };
    byFracture.set(board.common.fracture, found);
  }
  // The Thunder's Edge slot is a fact of the board once it is set; before that, the game it was made from says.
  const slot = board.common.thundersEdge ?? found.expedition.thundersEdgeSystem;
  return slot === found.expedition.thundersEdgeSystem ? found : { ...found, expedition: { ...found.expedition, thundersEdgeSystem: slot } };
}

/** The planets of a system, the Thunder's Edge planet in the system the expedition put it in. */
export const planetsIn = (table: Table, board: Board, pack: DataPack, slot: Slot): string[] => planetsOfSystem(mapSource(table, board), slot, pack);

/** The kind of tile a slot holds; none for a slot with no tile. */
export const tileKindIn = (table: Table, board: Board, pack: DataPack, slot: Slot): string | undefined => tileAt(mapSource(table, board), slot, pack)?.kind;

/** The wormholes a system holds: its tile's and its tokens'. */
export const wormholesIn = (table: Table, board: Board, pack: DataPack, slot: Slot): string[] =>
  [...new Set([...(tileAt(mapSource(table, board), slot, pack)?.wormholes ?? []), ...(board.common.wormholeTokens[slot] ?? [])])];

/** Every slot a ship can be in: the map, the Fracture and an off-map home. */
export const slotsOf = (table: Table, board: Board, pack: DataPack): Slot[] => boardSlots(mapSource(table, board), pack);

/** The systems one step from a system: neighbours, hyperlane lines, wormholes and the links given. */
export const adjacentSlots = (table: Table, board: Board, slot: Slot, pack: DataPack, links?: readonly Link[]): Slot[] =>
  adjacentTo(mapSource(table, board), slot, pack, links);

export const areJoined = (table: Table, board: Board, a: Slot, b: Slot, pack: DataPack, links?: readonly Link[]): boolean =>
  joined(mapSource(table, board), a, b, pack, links);

/** Steps from a system to every system joined to it, whatever stands in the way. */
export const distancesFrom = (table: Table, board: Board, from: Slot, pack: DataPack, links?: readonly Link[]): Map<Slot, number> =>
  routeDistances(mapSource(table, board), from, pack, links);

/** The systems where ships of players other than `mover` stand: a route may end there, never pass (58.3.2). */
export function shipBlockers(board: Board, mover: PlayerId, pack: DataPack): Set<Slot> {
  const blockers = new Set<Slot>();
  for (const [slot, system] of Object.entries(board.systems)) {
    for (const [player, units] of Object.entries(system.ships)) if (player !== mover && holdsShips(units, pack)) blockers.add(slot);
  }
  return blockers;
}

/** The ships of the others, and what the others' components bar to the mover (Aerie Hololattice). */
export function blockersOf(table: Table, board: Board, mover: PlayerId, pack: DataPack): Blockers {
  let by = BLOCKERS.get(board);
  if (by?.table !== table || by.pack !== pack) BLOCKERS.set(board, by = { table, pack, of: new Map() });
  let known = by.of.get(mover);
  if (!known) by.of.set(mover, known = blockersBuilt(table, board, mover, pack));
  return known;
}
/** Asked again and again for the one board a turn begins from; no one changes what it gives (a readonly set). */
const BLOCKERS = new WeakMap<Board, { table: Table; pack: DataPack; of: Map<PlayerId, Blockers> }>();

function blockersBuilt(table: Table, board: Board, mover: PlayerId, pack: DataPack): Blockers {
  const blockers = shipBlockers(board, mover, pack);
  const views = legacyViews(table, board, pack);
  const key = table.viewer === mover ? undefined : table.players.find(p => p.id === mover)?.legacyId ?? mover;
  for (const slot of passageBarredOf(views.game, views.states.me, key, pack)) blockers.add(slot);
  return blockers;
}

/** The systems a route enters, a hyperlane left out (58.3.2). */
export const pathOf = (table: Table, board: Board, path: Slot[], pack: DataPack, blockers?: Blockers): Slot[] =>
  fullPath(mapSource(table, board), path, pack, blockers);

export const stepsOf = (table: Table, board: Board, path: Slot[], pack: DataPack, blockers?: Blockers): number =>
  routeSteps(mapSource(table, board), path, pack, blockers);

/** Whether a ship may neither enter nor pass a system (asteroids, a supernova), and whether it may only end its move there. */
export const closed = (table: Table, board: Board, slot: Slot, pack: DataPack): boolean => closedToRoute(mapSource(table, board), slot, pack);
export const endsThere = (table: Table, board: Board, slot: Slot, pack: DataPack, blockers: Blockers): boolean => endsRoute(mapSource(table, board), slot, pack, blockers);

/** The systems a ship can still go to from the end of a path, by speed and the other players' ships. */
export const reach = (
  table: Table, board: Board, path: Slot[], speed: number, active: Slot, pack: DataPack, blockers: Blockers, view?: MoveView,
): Set<Slot> => routeReach({ ...mapSource(table, board) } as Parameters<typeof routeReach>[0], path, speed, active, pack, blockers, view);

/** The number of players the game began with: eliminations leave it, so the cards held at the table count by it (33.9). */
export const playerCountOf = (table: Table): number => SOURCES.get(table)?.playerCount ?? table.players.length;
