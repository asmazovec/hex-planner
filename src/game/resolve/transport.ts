/**
 * Transport (LRR 95, 16) and the fleet pool (37): what each moving group carries against its ships' capacity, what a
 * system holds against its capacity and the pool, and the ships the player removes beyond the pool. The sums are the
 * pure ones of `domain/replay/transport.ts`, asked of the player's stacks on the board.
 */
import { checkArrivalOf, checkGroupsOf, checkLeftBehindOf, checkSystemOf } from '../../domain/replay/transport';
import type { UnitCounts } from '../../domain/types';
import { stacksOn } from '../queries';
import { begin, emit, warn, type Ctx } from './context';
import type { Flown } from './movement';

/** After the flights: each group against its ships, what stays in the systems units left against the ships still there. */
export function afterFlights(ctx: Ctx, target: string, flown: Flown): void {
  begin(ctx, 'transport');
  const stacks = stacksOn(ctx.table, ctx.board, ctx.pack, ctx.player);
  warn(ctx, checkLeftBehindOf(stacks, flown.over, target, (ctx.entry as never as { moves: never }).moves, ctx.pack));
  warn(ctx, checkGroupsOf(stacks, flown.groups));
}

/**
 * The ships the player chose to remove beyond the fleet pool leave the active system, as many of each type as stand
 * there now; the rest is returned, to be removed after the production that builds them (37.3, note 2).
 */
export function removeFleetExcess(ctx: Ctx, target: string): UnitCounts {
  const wanted = ctx.tactical.fleetRemovals ?? {};
  const here = ctx.board.systems[target]?.ships[ctx.player] ?? {};
  const now: UnitCounts = {};
  const later: UnitCounts = {};
  for (const id of Object.keys(wanted) as (keyof UnitCounts)[]) {
    const n = wanted[id] ?? 0;
    const taken = Math.min(n, here[id] ?? 0);
    if (taken > 0) now[id] = taken;
    if (n > taken) later[id] = n - taken;
  }
  if (Object.keys(now).length > 0) emit(ctx, [{ type: 'UnitsRemoved', player: ctx.player, at: { slot: target }, units: now, reason: 'limit' }], { quiet: true });
  return later;
}

/** On arrival, before the battle: the ships in the active system against the fleet pool. */
export function arrival(ctx: Ctx, target: string): void {
  if (ctx.tactical.movement.length === 0) return;
  const landings = (ctx.entry as never as { landings: { from?: unknown; units: UnitCounts }[] }).landings;
  warn(ctx, checkArrivalOf(stacksOn(ctx.table, ctx.board, ctx.pack, ctx.player), target, landings.filter(landing => landing.from === undefined).map(landing => landing.units), ctx.pack));
}

/** The capacity and the fleet pool of the system after the action; one the action already warned of at arrival or after the battle is not repeated. */
export function finalCheck(ctx: Ctx, target: string): void {
  const built = Object.keys(ctx.tactical.production?.units ?? {}).length > 0;
  if (ctx.tactical.movement.length === 0 && !built) return;
  const found = checkSystemOf(stacksOn(ctx.table, ctx.board, ctx.pack, ctx.player), target);
  warn(ctx, found.filter(w => !ctx.warnings.some(g => g.code === w.code && g.params.systemId === w.params.systemId)));
}
