/**
 * Step 89.3 Combat: what the battles cost each side is removed (in space after the moves, on planets after the
 * landing), and what the surviving ships carry is checked. The battle itself is the player's: only its losses are entered.
 */
import { holdsShips } from '../../domain/movement';
import { planetsOf } from '../../domain/replay/board';
import { checkAfterCombat } from '../../domain/replay/combat';
import type { UnitCounts } from '../../domain/types';
import type { GameEvent } from '../events';
import { checkView, emit, warn, type Ctx } from './context';

/**
 * Whether anything can destroy ships in the active system once they arrived: another player's ships (a space combat),
 * or planets (space cannon). Losses where nothing can were taken on the way, in a gravity rift (37 note 4).
 */
export function canFight(ctx: Ctx, target: string): boolean {
  const v = checkView(ctx);
  if (planetsOf(v.game, target, ctx.pack).length > 0) return true;
  return Object.entries(ctx.board.systems[target]?.ships ?? {}).some(([player, units]) => player !== ctx.player && holdsShips(units, ctx.pack));
}

const nonEmpty = (units: UnitCounts | undefined): units is UnitCounts => Object.values(units ?? {}).some(n => (n ?? 0) > 0);

/** The ships each side lost in the active system leave it. A loss of what is not there is reported. */
export function spaceLosses(ctx: Ctx, target: string): void {
  const events: GameEvent[] = Object.entries(ctx.tactical.spaceCombat ?? {}).flatMap(([player, units]) =>
    (nonEmpty(units) ? [{ type: 'UnitsRemoved', player, at: { slot: target }, units, reason: 'combat' } as GameEvent] : []));
  emit(ctx, events, { step: 'combat' });
}

/** After the space combat (16.3.3, 78.10.1): what the ships left cannot carry. */
export function afterCombat(ctx: Ctx, target: string): void {
  const v = checkView(ctx);
  warn(ctx, checkAfterCombat(v.game, v.state, target, ctx.entry as never, ctx.pack));
}

/** The ground forces each side lost on the planets, after the landing. */
export function groundLosses(ctx: Ctx): void {
  const events: GameEvent[] = Object.entries(ctx.tactical.groundCombat ?? {}).flatMap(([planet, bySide]) =>
    Object.entries(bySide).flatMap(([player, units]) => (nonEmpty(units) ? [{ type: 'UnitsRemoved', player, at: { planet }, units, reason: 'combat' } as GameEvent] : [])));
  emit(ctx, events, { step: 'combat' });
}
