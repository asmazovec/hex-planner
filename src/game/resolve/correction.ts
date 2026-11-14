/**
 * A manual correction, and an agenda card as the numbers it changed: counts change by the delta, signed. A unit count
 * that goes below what stands there reports what was missing (the stack stops at nothing).
 */
import type { UnitCounts, UnitId } from '../../domain/types';
import type { TurnFacts } from '../turnFacts';
import type { GameEvent, Place } from '../events';
import { emit, type Ctx } from './context';

type Adjustment = Extract<TurnFacts, { type: 'adjustment' }>;

function shifts(ctx: Ctx, at: Place, units: UnitCounts): GameEvent[] {
  const up: UnitCounts = {};
  const down: UnitCounts = {};
  for (const id of Object.keys(units) as UnitId[]) {
    const n = units[id] ?? 0;
    if (n > 0) up[id] = n;
    if (n < 0) down[id] = -n;
  }
  return [
    ...(Object.keys(up).length > 0 ? [{ type: 'UnitsPlaced' as const, player: ctx.player, at, units: up }] : []),
    ...(Object.keys(down).length > 0 ? [{ type: 'UnitsRemoved' as const, player: ctx.player, at, units: down }] : []),
  ];
}

export function correction(ctx: Ctx): void {
  const d = (ctx.entry as Adjustment).delta;
  const player = ctx.player;
  const events: GameEvent[] = [];
  if (d.tradeGoods) events.push({ type: 'TradeGoodsChanged', player, delta: d.tradeGoods });
  if (d.commodities) events.push({ type: 'CommoditiesChanged', player, delta: d.commodities });
  const tokens = { tactic: d.tactic ?? 0, fleet: d.fleet ?? 0, strategy: d.strategy ?? 0 };
  const delta = Object.fromEntries(Object.entries(tokens).filter(([, n]) => n !== 0));
  if (Object.keys(delta).length > 0) events.push({ type: 'TokensChanged', player, delta });
  if (d.vp) events.push({ type: 'PointsChanged', player, delta: d.vp });
  emit(ctx, events, { quiet: true });
  if (d.units) emit(ctx, shifts(ctx, { slot: d.units.systemId }, d.units.units), { step: 'round' });
  for (const [planet, units] of Object.entries(d.ground ?? {})) emit(ctx, shifts(ctx, { planet }, units), { step: 'round' });
}
