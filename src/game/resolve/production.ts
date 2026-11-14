/**
 * Step 89.5 Production: the units built are checked against the Production of the system and the reinforcements, placed
 * where the rules put them, and paid for in resources. The producers, the limits and the costs are the old pure
 * functions over the board's views; the placing and the paying are events.
 */
import { violation } from '../../domain/rules/registry';
import productionShipsAway from '../../domain/rules/codes/productionShipsAway';
import { checkProductionOn, costOn, placesOn, producersOn } from '../../domain/replay/production';
import type { UnitCounts } from '../../domain/types';
import type { GameEvent } from '../events';
import { groundIn } from '../queries';
import { emit, warn, type Ctx } from './context';
import { pay, checkPay, shortOf } from './payment';

const ids = (units: UnitCounts): (keyof UnitCounts)[] => (Object.keys(units) as (keyof UnitCounts)[]).filter(id => (units[id] ?? 0) > 0);

/** Puts built units where the rules place them. */
export function place(ctx: Ctx, target: string, units: UnitCounts, onPlanets?: Record<string, UnitCounts>): void {
  const events: GameEvent[] = placesOn(groundIn(ctx.table, ctx.board, ctx.pack, ctx.player), target, units, ctx.pack, onPlanets).map(({ unit, planetId, count }) => ({
    type: 'UnitsPlaced', player: ctx.player, at: planetId === null ? { slot: target } : { planet: planetId }, units: { [unit]: count },
  }));
  emit(ctx, events, { quiet: true });
}

/** Checks and places what the action builds; returns whether a unit used PRODUCTION (Sarween Tools asks). `removeLater` goes after the building (37 note 2). */
export function produce(ctx: Ctx, target: string, removeLater: UnitCounts): boolean {
  const build = ctx.tactical.production;
  const units = build?.units ?? {};
  const ground = groundIn(ctx.table, ctx.board, ctx.pack, ctx.player);
  warn(ctx, checkProductionOn(ground, target, units, ctx.pack, build?.ground, 'system', undefined, ctx.entry));
  const producing = producersOn(ground, target, ctx.pack).length > 0;
  const away = build?.shipsTo !== undefined && build.shipsTo !== target && ctx.table.map[build.shipsTo] !== undefined ? build.shipsTo : undefined;
  const ships = Object.fromEntries(ids(units).filter(id => !ctx.pack.units[id]?.ground).map(id => [id, units[id]])) as UnitCounts;
  if (away && ids(ships).length > 0) {
    // 68.2: the ships belong in the active system; they stand where the player placed them, and a component may lift the warning.
    warn(ctx, violation(productionShipsAway.code, { systemId: target, to: away }, 'production'));
    const rest = { ...units };
    for (const id of ids(ships)) delete rest[id];
    place(ctx, target, rest, build?.ground);
    place(ctx, away, ships);
  } else place(ctx, target, units, build?.ground);
  if (ids(removeLater).length > 0) emit(ctx, [{ type: 'UnitsRemoved', player: ctx.player, at: { slot: target }, units: removeLater, reason: 'limit' }], { step: 'production' });
  return producing;
}

/** The production is paid in resources: the payment is made, and a shortfall reported. */
export function payProduction(ctx: Ctx, producing: boolean): void {
  const build = ctx.tactical.production;
  const cost = costOn(groundIn(ctx.table, ctx.board, ctx.pack, ctx.player), build?.units ?? {}, ctx.pack, producing, ctx.entry);
  const payment = build?.payment ?? { planets: [], tradeGoods: 0 };
  warn(ctx, checkPay(ctx, payment));
  const paid = pay(ctx, payment, 'resources');
  shortOf(ctx, 'resources', cost, paid);
}
