/** Payment: planets are exhausted and trade goods spent for what a turn costs. The check and the value are the old pure ones; the exhausting is events. */
import { isPlanetCard, type PaymentKind } from '../../domain/payment';
import { violation } from '../../domain/rules/registry';
import type { Payment, RuleStep, Warning } from '../../domain/types';
import type { GameEvent } from '../events';
import { planetValue, tradeGoodWorth } from '../queries';
import { emit, warn, type Ctx } from './context';

/**
 * Exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`: each planet by
 * its value after the components of the payer, each trade good by its worth. The checks are the caller's.
 */
export function pay(ctx: Ctx, payment: Payment, kind: PaymentKind): number {
  const me = ctx.board.players[ctx.player];
  const events: GameEvent[] = [];
  const spent = new Set<string>();
  const cards = new Set(Object.entries(me?.cards ?? {}).filter(([, hold]) => hold.state === 'exhausted').map(([id]) => id));
  let value = 0;
  for (const planetId of payment.planets) {
    if (isPlanetCard(planetId)) {
      if (me?.cards[planetId] === undefined || cards.has(planetId)) continue;
      cards.add(planetId);
      events.push({ type: 'CardExhausted', player: ctx.player, card: planetId });
      value += planetValue(ctx.table, ctx.board, ctx.pack, ctx.player, planetId, kind);
      continue;
    }
    const planet = ctx.board.planets[planetId];
    if (spent.has(planetId) || (planet?.exhausted && planet.owner === ctx.player)) continue;
    spent.add(planetId);
    // A planet someone else holds is theirs to exhaust: the payer's warning stands (34 note 2), the planet stays ready.
    if (planet?.owner !== undefined && planet.owner !== ctx.player) continue;
    events.push({ type: 'PlanetExhausted', player: ctx.player, planet: planetId });
    if (planet?.owner === ctx.player) value += planetValue(ctx.table, ctx.board, ctx.pack, ctx.player, planetId, kind);
  }
  const goods = Math.max(0, Math.min(payment.tradeGoods, me?.tradeGoods ?? 0));
  if (goods > 0) events.push({ type: 'TradeGoodsChanged', player: ctx.player, delta: -goods });
  emit(ctx, events, { quiet: true });
  return value + goods * tradeGoodWorth(ctx.table, ctx.board, ctx.pack, ctx.player, kind);
}

/** The warnings of a payment over the board before it: a planet not held, spent twice, trade goods that are not there. */
export function checkPay(ctx: Ctx, payment: Payment, step?: RuleStep): Warning[] {
  const found: Warning[] = [];
  const me = ctx.board.players[ctx.player];
  const spent = new Set<string>();
  const cards = new Set(Object.entries(me?.cards ?? {}).filter(([, hold]) => hold.state === 'exhausted').map(([id]) => id));
  for (const planetId of payment.planets) {
    if (isPlanetCard(planetId)) {
      found.push(violation('planetNotControlled', { planetId }, step));
      if (me?.cards[planetId] !== undefined && cards.has(planetId)) found.push(violation('planetExhausted', { planetId }, step));
      cards.add(planetId);
      continue;
    }
    const planet = ctx.board.planets[planetId];
    if (planet?.owner !== ctx.player) found.push(violation('planetNotControlled', { planetId }, step));
    else if (spent.has(planetId) || planet.exhausted) found.push(violation('planetExhausted', { planetId }, step));
    spent.add(planetId);
  }
  if (payment.tradeGoods > (me?.tradeGoods ?? 0)) found.push(violation('shortTradeGoods', { needed: payment.tradeGoods, have: me?.tradeGoods ?? 0 }, step));
  return found;
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
