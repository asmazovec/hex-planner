/** Payment: planets are exhausted and trade goods spent for what a turn costs. The check and the value are the old pure ones; the exhausting is events. */
import { isPlanetCard, planetValue, tradeGoodWorth, type PaymentKind } from '../../domain/payment';
import { checkPayment } from '../../domain/replay/payment';
import { violation } from '../../domain/rules/registry';
import type { Payment, RuleStep, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { viewFor } from '../legacyViews';
import { emit, warn, type Ctx } from './context';

/**
 * Exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`: each planet by
 * its value after the components of the payer, each trade good by its worth. The checks are the caller's.
 */
export function pay(ctx: Ctx, payment: Payment, kind: PaymentKind): number {
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player);
  const view = { faction: v.game.faction, shared: v.shared };
  const events: GameEvent[] = [];
  const spent = new Set(v.state.exhausted);
  const cards = new Set(v.state.holdings.exhausted);
  let value = 0;
  for (const planetId of payment.planets) {
    if (isPlanetCard(planetId)) {
      if (!v.state.holdings.relics.includes(planetId) || cards.has(planetId)) continue;
      cards.add(planetId);
      events.push({ type: 'CardExhausted', player: ctx.player, card: planetId });
      value += planetValue(ctx.pack, v.state, planetId, kind, view);
      continue;
    }
    if (spent.has(planetId)) continue;
    spent.add(planetId);
    // A planet someone else holds is theirs to exhaust: the payer's warning stands (34 note 2), the planet stays ready.
    const owner = ctx.board.planets[planetId]?.owner;
    if (owner !== undefined && owner !== ctx.player) continue;
    events.push({ type: 'PlanetExhausted', player: ctx.player, planet: planetId });
    if (v.state.control[planetId] === 'me') value += planetValue(ctx.pack, v.state, planetId, kind, view);
  }
  const goods = Math.max(0, Math.min(payment.tradeGoods, v.state.tradeGoods));
  if (goods > 0) events.push({ type: 'TradeGoodsChanged', player: ctx.player, delta: -goods });
  emit(ctx, events, { quiet: true });
  return value + goods * tradeGoodWorth(ctx.pack, v.state, kind, view);
}

/** The warnings of a payment over the state before it: a planet not held, spent twice, trade goods that are not there. */
export function checkPay(ctx: Ctx, payment: Payment, step?: RuleStep): Warning[] {
  return checkPayment(viewFor(ctx.table, ctx.board, ctx.pack, ctx.player).state, payment, step ? { step } : undefined);
}

/** A payment with its own check, as the old replay's `pay`. */
export function checkedPay(ctx: Ctx, payment: Payment, kind: PaymentKind, step?: RuleStep): number {
  warn(ctx, checkPay(ctx, payment, step));
  return pay(ctx, payment, kind);
}

/** The shortfall of a payment against a price, as the old replay words it. */
export function shortOf(ctx: Ctx, kind: PaymentKind, needed: number, paid: number, step?: RuleStep): void {
  if (paid < needed) warn(ctx, violation(kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed, paid }, step));
}
