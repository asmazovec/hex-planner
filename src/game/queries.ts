/**
 * What the board says, with no rules in it yet: no costs, no values of planets. These are the plain reads the rest of
 * the kernel and, through `api.ts`, the interface are allowed to make. Every one answers for a missing place with an empty answer.
 */
import type { Board, CardState, ComponentId, PlanetId, PlayerId, Pools, Slot, StructureCounts, UnitCounts } from './types';

/** The units of a player in the space area of a system: ships, and what they carry. */
export const shipsIn = (board: Board, slot: Slot, player: PlayerId): UnitCounts => board.systems[slot]?.ships[player] ?? {};

/** The ground forces of a player on a planet. */
export const groundOn = (board: Board, planet: PlanetId, player: PlayerId): UnitCounts => board.planets[planet]?.ground[player] ?? {};

export const ownerOf = (board: Board, planet: PlanetId): PlayerId | undefined => board.planets[planet]?.owner;

/** The planets a player holds, by id. */
export const planetsOf = (board: Board, player: PlayerId): PlanetId[] =>
  Object.keys(board.planets).filter(id => board.planets[id].owner === player).sort();

/** The structures of a player on planets (those afloat are not on a planet yet), by planet id. */
export const structuresOf = (board: Board, player: PlayerId): { planet: PlanetId; structures: StructureCounts }[] =>
  planetsOf(board, player)
    .filter(id => Object.keys(board.planets[id].structures).length > 0)
    .map(planet => ({ planet, structures: board.planets[planet].structures }));

export interface HeldCard { id: ComponentId; state: CardState; count: number }

/** What a player holds, purged cards left out; `kind` is the part of the id before the colon. */
export function cardsOf(board: Board, player: PlayerId, kind?: string): HeldCard[] {
  return Object.entries(board.players[player]?.cards ?? {})
    .filter(([id, hold]) => hold.state !== 'purged' && (kind === undefined || id.startsWith(`${kind}:`)))
    .map(([id, hold]) => ({ id, state: hold.state, count: hold.count }));
}

export const poolsOf = (board: Board, player: PlayerId): Pools => board.players[player]?.pools ?? { tactic: 0, fleet: 0, strategy: 0 };
