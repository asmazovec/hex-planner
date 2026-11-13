/**
 * The helpers that change a board, by copying the path to the change and sharing the rest. Only `apply.ts` imports
 * this file (the contract test checks it): the board is changed in one place.
 */
import { emptyPlanet, emptyPlayer, emptySystem } from './board';
import type { Board, CommonState, PlanetId, PlanetState, PlayerId, PlayerState, Slot, SystemState } from './types';

export function patchPlayer(board: Board, id: PlayerId, change: (player: PlayerState) => PlayerState): Board {
  const was = board.players[id] ?? emptyPlayer();
  const now = change(was);
  return now === was && board.players[id] ? board : { ...board, players: { ...board.players, [id]: now } };
}

export function patchSystem(board: Board, slot: Slot, change: (system: SystemState) => SystemState): Board {
  const was = board.systems[slot] ?? emptySystem();
  const now = change(was);
  return now === was && board.systems[slot] ? board : { ...board, systems: { ...board.systems, [slot]: now } };
}

export function patchPlanet(board: Board, id: PlanetId, change: (planet: PlanetState) => PlanetState): Board {
  const was = board.planets[id] ?? emptyPlanet();
  const now = change(was);
  return now === was && board.planets[id] ? board : { ...board, planets: { ...board.planets, [id]: now } };
}

export function patchCommon(board: Board, change: (common: CommonState) => CommonState): Board {
  const now = change(board.common);
  return now === board.common ? board : { ...board, common: now };
}

export const patchBoard = (board: Board, change: Partial<Board>): Board => ({ ...board, ...change });

/** A signed change of the counts in a record: zeros leave it, and what goes below zero stops at zero and is returned as `short`. */
export function shiftCounts<K extends string>(
  counts: Partial<Record<K, number>>, delta: Partial<Record<K, number>>,
): { counts: Partial<Record<K, number>>; short: [K, number][] } {
  const next = { ...counts };
  const short: [K, number][] = [];
  for (const key of Object.keys(delta) as K[]) {
    const sum = (next[key] ?? 0) + (delta[key] ?? 0);
    if (sum < 0) short.push([key, -sum]);
    if (sum > 0) next[key] = sum;
    else delete next[key];
  }
  return { counts: next, short };
}

/** What a removal can take: the request clamped to what is there. */
export function takable<K extends string>(counts: Partial<Record<K, number>>, wanted: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const taken: Partial<Record<K, number>> = {};
  for (const key of Object.keys(wanted) as K[]) {
    const n = Math.min(wanted[key] ?? 0, counts[key] ?? 0);
    if (n > 0) taken[key] = n;
  }
  return taken;
}

export const negate = <K extends string>(counts: Partial<Record<K, number>>): Partial<Record<K, number>> =>
  Object.fromEntries(Object.entries<number | undefined>(counts).map(([k, n]) => [k, -(n ?? 0)])) as Partial<Record<K, number>>;
