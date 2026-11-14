/**
 * Helpers for the files of the components that touch movement, transport and activation: the numbers a `modify` of
 * `speed` needs. (The questions about a route warning are on the permit's context, `PermitContext`.) They call the
 * domain, so a file may use them inside `modify` and `play` only, never at its top level (see docs/phase4/component-effects.md).
 */
import { MECATOL_TILE, MECATOL_TILE_TE } from '../../mecatol';
import { adjacentTo, shipSpeed, wormholesOf } from '../../movement';
import { hasAnomaly, planetsOf, systemSlots, tileIdOf } from '../../replay/board';
import { unitIds } from '../../replay/state';
import { homeSlot } from '../../strategy';
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../../types';
import type { ModifierContext } from '../types';
import '../points/movement';

type SpeedCtx = ModifierContext['speed'];

// ---------------------------------------------------------------- speed

/** A change of the move value that leaves a unit that does not move by itself (value 0) as it is. */
export const plusSpeed = (steps: number) => (value: number): number => (value > 0 ? value + steps : value);

/** The highest move value among the units moving together with this one; 0 where the group or the board is not told. */
export function fastestOfGroup(ctx: SpeedCtx): number {
  const { game, pack, state, group } = ctx;
  if (!game || !pack || !state || !group) return 0;
  return Math.max(0, ...unitIds(group).flatMap(unit => shipSpeed(game, unit, state.holdings, pack) ?? []));
}

/** Whether the move starts in the player's home system. */
export const startsAtHome = (ctx: SpeedCtx): boolean =>
  ctx.game !== undefined && ctx.pack !== undefined && ctx.from !== undefined && homeSlot(ctx.game, ctx.pack) === ctx.from;

/** Whether the move starts in a system of the open Fracture. */
export const startsInFracture = (ctx: SpeedCtx): boolean =>
  ctx.game !== undefined && ctx.from !== undefined && ctx.game.fracture.tiles?.[ctx.from] !== undefined;

/** The wormholes of the system the move starts in, the tokens put there (Creuss) included. */
export const startWormholes = (ctx: SpeedCtx): string[] =>
  ctx.game && ctx.pack && ctx.from !== undefined ? wormholesOf(ctx.game, ctx.pack, ctx.from, (ctx.shared ?? ctx.state)?.wormholeTokens) : [];

/** Whether the active system is next to an anomaly of any kind (the system itself does not count). */
export function activeNextToAnomaly(ctx: SpeedCtx): boolean {
  const { game, pack, systemId } = ctx;
  if (!game || !pack || systemId === undefined) return false;
  return adjacentTo(game, systemId, pack).some(slot => (['asteroid', 'nebula', 'rift', 'supernova'] as const).some(kind => hasAnomaly(game, slot, kind, pack)));
}

// ---------------------------------------------------------------- places

/**
 * Whether a player has a unit of any kind in a system: ships, ground forces on its planets, structures on them; by `me`
 * or an opponent's id. What stands on the map by hand for a player with no replayed state counts as well.
 */
export function playerHolds(game: Game, shared: GameState, player: string, slot: string, pack: DataPack): boolean {
  const state = player === 'me' ? shared : shared.rivals?.[player];
  const holds = (units: UnitCounts | undefined): boolean => unitIds(units ?? {}).length > 0;
  const planets = planetsOf(game, slot, pack);
  if (state) {
    return holds(state.systems[slot]) || planets.some(id => holds(state.ground[id]) || state.docks.includes(id) || (state.pds[id] ?? 0) > 0) || Object.values(state.afloat?.[slot] ?? {}).some(n => (n ?? 0) > 0);
  }
  return holds(game.enemyUnits[slot]?.[player]) || planets.some(id => holds(game.enemyGround[id]?.[player]));
}

/** By how many steps a speedShort warning falls short. */
export const shortfall = (warning: Warning): number => Number(warning.params.steps) - Number(warning.params.move);

/** The slot of Mecatol Rex on the map, whichever tile (18 or 112) stands there. */
export const mecatolSlot = (game: Game): string | undefined =>
  systemSlots(game).find(slot => [MECATOL_TILE, MECATOL_TILE_TE].includes(tileIdOf(game, slot)));

/** Whether a system holds a space dock of the player (the state of the `gravityRift` ask, or any other with `docks`). */
export const ownDockIn = (game: Game, state: Pick<GameState, 'docks'> | undefined, slot: string, pack: DataPack): boolean =>
  state !== undefined && planetsOf(game, slot, pack).some(planetId => state.docks.includes(planetId));

/** The systems the ships of a player stand in (space areas only). */
export const shipSlots = (state: GameState, pack: DataPack): string[] =>
  Object.entries(state.systems).flatMap(([slot, units]) => (unitIds(units).some(unit => pack.units[unit] !== undefined && !pack.units[unit].ground) ? [slot] : []));
