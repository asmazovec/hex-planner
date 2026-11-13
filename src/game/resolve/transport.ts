/**
 * Transport (LRR 95, 16) and the fleet pool (37): what each moving group carries against its ships' capacity, what a
 * system holds against its capacity and the pool, and the ships the player removes beyond the pool. The sums are the
 * old pure ones, asked over the board's views.
 */
import { checkArrival } from '../../domain/replay/combat';
import { checkGroups, checkLeftBehind, checkSystem } from '../../domain/replay/transport';
import type { UnitCounts } from '../../domain/types';
import { begin, checkView, emit, warn, type Ctx } from './context';
import type { Flown } from './movement';

/** After the flights: each group against its ships, what stays in the systems units left against the ships still there. */
export function afterFlights(ctx: Ctx, target: string, flown: Flown): void {
  begin(ctx, 'transport');
  const v = checkView(ctx);
  warn(ctx, checkLeftBehind(v.game, v.state, flown.over, target, (ctx.entry as never as { moves: never }).moves, ctx.pack));
  warn(ctx, checkGroups(v.game, v.state, flown.groups, ctx.pack));
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
  const v = checkView(ctx);
  warn(ctx, checkArrival(v.game, v.state, target, ctx.entry as never, ctx.pack));
}

/** The capacity and the fleet pool of the system after the action; one the action already warned of at arrival or after the battle is not repeated. */
export function finalCheck(ctx: Ctx, target: string): void {
  const built = Object.keys(ctx.tactical.production?.units ?? {}).length > 0;
  if (ctx.tactical.movement.length === 0 && !built) return;
  const v = checkView(ctx);
  const found = checkSystem(v.game, v.state, target, ctx.pack);
  warn(ctx, found.filter(w => !ctx.warnings.some(g => g.code === w.code && g.params.systemId === w.params.systemId)));
}
