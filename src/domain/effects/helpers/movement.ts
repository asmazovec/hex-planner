/**
 * Helpers for the files of the components that touch movement, transport and activation: the numbers a `modify` of
 * `speed` needs, and the questions a waiver's `when` asks about a route warning. They call the domain, so a file may
 * use them inside `when`, `modify` and `play` only, never at its top level (see docs/phase4/component-effects.md).
 */
import { MECATOL_TILE, MECATOL_TILE_TE } from '../../mecatol';
import { adjacentTo, blockersOf, closedToRoute, fullPath, linksOf, passageBarredOf, shipBlockersOf, shipSpeed, wormholesOf, type Link } from '../../movement';
import { presentNear } from '../../neighbors';
import { hasAnomaly, planetsOf, systemSlots, tileIdOf } from '../../replay/board';
import { checkEntryRoutes } from '../../replay/movement';
import { unitIds, type Move } from '../../replay/state';
import { homeSlot } from '../../strategy';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../../types';
import { emptyHoldings } from '../../holdings';
import type { ModifierContext, WaiverContext } from '../types';
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

// ---------------------------------------------------------------- the warning of a route

/** The move of the entry that left the warning's source: the units named by the player. */
export function moveFrom(warning: Warning, ctx: WaiverContext): Move | undefined {
  const entry = ctx.entry;
  return entry?.type === 'tactical' ? entry.moves.find(move => move.from === warning.params.from) : undefined;
}

/** How many of the warning's unit moved from its source in the entry. */
export const movingCount = (warning: Warning, ctx: WaiverContext): number =>
  (moveFrom(warning, ctx)?.units as UnitCounts | undefined)?.[String(warning.params.unit) as keyof UnitCounts] ?? 0;

/** By how many steps a speedShort warning falls short. */
export const shortfall = (warning: Warning): number => Number(warning.params.steps) - Number(warning.params.move);

/** What blocks a system on a route: the kind of anomaly that closes or ends it, or other players' ships, or a hyperlane. */
export type BlockKind = 'asteroid' | 'supernova' | 'nebula' | 'ships' | 'structures' | 'hyperlane';

/** The systems that end a route of the entry's owner: other players' ships as the board stands before the entry. */
export const blockedByShips = (ctx: WaiverContext, systemId: string): boolean =>
  shipBlockersOf(ctx.game, ctx.shared, ctx.entry?.owner && ctx.shared.rivals?.[ctx.entry.owner] ? ctx.entry.owner : undefined, ctx.pack).has(systemId);

/** What a routeBlocked warning is about; an anomaly comes before the ships standing in it. */
export function routeBlockKind(warning: Warning, ctx: WaiverContext): BlockKind | undefined {
  if (warning.code !== 'routeBlocked') return undefined;
  if (warning.params.context === 'hyperlane') return 'hyperlane';
  const slot = String(warning.params.systemId);
  for (const kind of ['asteroid', 'supernova', 'nebula'] as const) if (hasAnomaly(ctx.game, slot, kind, ctx.pack)) return kind;
  if (blockedByShips(ctx, slot)) return 'ships';
  return passageBarredOf(ctx.game, ctx.shared, ctx.entry?.owner && ctx.shared.rivals?.[ctx.entry.owner] ? ctx.entry.owner : undefined, ctx.pack).has(slot) ? 'structures' : undefined;
}

/** Whether the system of the warning is one a route cannot even enter (asteroids, a supernova). */
export const closedSystem = (warning: Warning, ctx: WaiverContext): boolean => closedToRoute(ctx.game, String(warning.params.systemId), ctx.pack);

/** The speedShort warnings of the entry as the replay makes them, in order. */
export function speedWarningsOf(ctx: WaiverContext): Warning[] {
  const entry = ctx.entry;
  if (entry?.type !== 'tactical') return [];
  const blockers = blockersOf(ctx.game, ctx.shared, entry.owner && ctx.shared.rivals?.[entry.owner] ? entry.owner : undefined, ctx.pack);
  return checkEntryRoutes(ctx.game, ctx.before, ctx.shared, entry, ctx.pack, blockers).filter(warning => warning.code === 'speedShort');
}

const sameWarning = (a: Warning, b: Warning): boolean => a.code === b.code && JSON.stringify(a.params) === JSON.stringify(b.params);

/**
 * A speedShort warning that one ship's shortfall of at most `by` steps lifts: the unit moves alone from its source
 * (one of its type), and the warning is the first of the entry that fits, so another ship short by the same is not covered.
 */
export function oneShipShort(warning: Warning, ctx: WaiverContext, by = 1): boolean {
  if (warning.code !== 'speedShort' || shortfall(warning) > by || movingCount(warning, ctx) !== 1) return false;
  const first = speedWarningsOf(ctx).find(other => shortfall(other) <= by && movingCount(other, ctx) === 1);
  return first !== undefined && sameWarning(first, warning);
}

/** The highest move value of any ship on the board, every player's (Saar's agent). */
export function fastestOnBoard(ctx: WaiverContext): number {
  const { game, pack, shared, before } = ctx;
  const best: number[] = [];
  const count = (view: Game, units: Record<string, UnitCounts>, held: GameState['holdings']): void => {
    for (const units1 of Object.values(units)) {
      for (const unit of unitIds(units1)) best.push(shipSpeed(view, unit, held, pack) ?? 0);
    }
  };
  count(game, before.systems, before.holdings);
  // The game is the owner's: its opponents are everyone else, me among them when the owner is an opponent of mine.
  for (const player of game.opponents) {
    const held = player.id === 'me' ? shared : shared.rivals?.[player.id];
    const view: Game = { ...game, faction: player.faction };
    if (held) count(view, held.systems, held.holdings);
    else for (const byOwner of Object.values(game.enemyUnits)) count(view, { x: byOwner[player.id] ?? {} }, emptyHoldings());
  }
  return Math.max(0, ...best);
}

// ---------------------------------------------------------------- places

/** The slot of Mecatol Rex on the map, whichever tile (18 or 112) stands there. */
export const mecatolSlot = (game: Game): string | undefined =>
  systemSlots(game).find(slot => [MECATOL_TILE, MECATOL_TILE_TE].includes(tileIdOf(game, slot)));

/** Whether another player is present in a system or next to it (`player` as a warning names it: `me` or an opponent's id). */
export function playerNear(ctx: WaiverContext, player: string, slot: string, links?: readonly Link[]): boolean {
  const state = player === 'me' ? ctx.shared : ctx.shared.rivals?.[player];
  return state !== undefined && presentNear(ctx.game, state, slot, ctx.pack, links);
}

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

/** The systems of the route the warning is about, the start and the active system included, hyperlanes dropped (58.3.2). */
export function routeOf(warning: Warning, ctx: WaiverContext): string[] {
  const move = moveFrom(warning, ctx);
  const target = ctx.entry?.type === 'tactical' ? ctx.entry.systemId : null;
  return target === null || !move ? [] : fullPath(ctx.game, [move.from, ...(move.via ?? []), target], ctx.pack);
}

/** Whether the route leaves or crosses a gravity rift: the rifts of every system of it but the active one (41.3). */
export const crossesRift = (warning: Warning, ctx: WaiverContext): boolean =>
  routeOf(warning, ctx).slice(0, -1).some(slot => hasAnomaly(ctx.game, slot, 'rift', ctx.pack));

/** The move value of the warning's ship by the printed rules and its upgrades alone: no nebula start, no rift. */
export function speedWithoutAnomalies(warning: Warning, ctx: WaiverContext): number {
  return shipSpeed(ctx.game, String(warning.params.unit) as UnitId, ctx.before.holdings, ctx.pack) ?? 0;
}

/** Whether every unit the move carried is of one of these types. */
export const onlyUnits = (warning: Warning, ctx: WaiverContext, kinds: readonly UnitId[]): boolean => {
  const units = moveFrom(warning, ctx)?.units ?? {};
  return unitIds(units).length > 0 && unitIds(units).every(unit => kinds.includes(unit));
};

/** Whether the move carried ships alone: no ground forces and no fighters. */
export const shipsOnly = (warning: Warning, ctx: WaiverContext): boolean =>
  unitIds(moveFrom(warning, ctx)?.units ?? {}).every(unit => {
    const def = ctx.pack.units[unit];
    return def !== undefined && !def.ground && !def.fighter;
  });

/** The ships (not fighters, not ground forces) other players have in a system, as the board stands before the entry. */
export function othersShipsIn(ctx: WaiverContext, slot: string): UnitCounts {
  const total: UnitCounts = {};
  const add = (units: UnitCounts | undefined): void => {
    for (const unit of unitIds(units ?? {})) if (ctx.pack.units[unit] && !ctx.pack.units[unit].ground && !ctx.pack.units[unit].fighter) total[unit] = (total[unit] ?? 0) + (units?.[unit] ?? 0);
  };
  const owner = ctx.entry?.owner && ctx.shared.rivals?.[ctx.entry.owner] ? ctx.entry.owner : 'me';
  if (owner !== 'me') add(ctx.shared.systems[slot]);
  for (const [id, rival] of Object.entries(ctx.shared.rivals ?? {})) if (id !== owner) add(rival.systems[slot]);
  for (const [id, units] of Object.entries(ctx.game.enemyUnits[slot] ?? {})) if (id !== owner && !(id in (ctx.shared.rivals ?? {}))) add(units);
  return total;
}

/** Whether a system holds a space dock of the player (the state of the `gravityRift` ask, or any other with `docks`). */
export const ownDockIn = (game: Game, state: Pick<GameState, 'docks'> | undefined, slot: string, pack: DataPack): boolean =>
  state !== undefined && planetsOf(game, slot, pack).some(planetId => state.docks.includes(planetId));

/** The systems the ships of a player stand in (space areas only). */
export const shipSlots = (state: GameState, pack: DataPack): string[] =>
  Object.entries(state.systems).flatMap(([slot, units]) => (unitIds(units).some(unit => pack.units[unit] !== undefined && !pack.units[unit].ground) ? [slot] : []));

/** The extra adjacency of the owner of a waiver's entry during their tactical action. */
export const linksFor = (ctx: WaiverContext): Link[] => linksOf(ctx.game, ctx.pack, { state: ctx.before, shared: ctx.shared, during: 'tactical' });
