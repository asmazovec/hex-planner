/**
 * The acts of a turn, after its action: the transactions with neighbours in order (LRR 94), then the expedition at the
 * end of the turn (Thunder's Edge, expedition 2). Nothing is forbidden; what breaks a rule warns. What changes hands is
 * an event (`GoodsTransferred`, a card lost and gained); only what the components in force answer to a settled deal
 * (the `dealt` hook) and to a card gained (the `gained` hook) is asked of the adapter.
 */
import { componentById } from '../../domain/components';
import { breakthroughOf } from '../../domain/effects/breakthrough';
import { staysInPlay, TRANSACTION_KINDS } from '../../domain/holdings';
import { EXPEDITION_SLICES, techSlicePlanets } from '../../domain/payment';
import { holds } from '../../domain/replay/holdings';
import { violation } from '../../domain/rules/registry';
import type { Act, Goods } from '../../domain/types';
import { holdingsOfCards, legacyKey } from '../legacyViews';
import { areNeighbours } from '../queries';
import type { PlayerId } from '../types';
import { begin, checkView, emit, warn, type Ctx } from './context';
import { gain, lose } from './holdings';
import { hook } from './hooks';
import { checkedPay, shortOf } from './payment';

const actsOf = (ctx: Ctx): Act[] => ('acts' in ctx.entry && Array.isArray(ctx.entry.acts) ? ctx.entry.acts : []);

/**
 * What one side gives to the other: trade goods as trade goods, commodities as trade goods of the receiver (21.5, the
 * event does it), a component by its kind. What the giver lacks warns and stays where it is: nothing goes below zero and
 * nothing comes from nowhere. A component of a kind a transaction does not move (94.3: only promissory notes; an action
 * card needs an ability, 94.3.1, which lifts the warning) and a second promissory note (69.5) warn and move all the same.
 * Returns what moved.
 */
function hand(ctx: Ctx, from: PlayerId, to: PlayerId, goods: Goods): Goods {
  let notes = 0;
  const moved: Goods = {};
  for (const id of goods.components ?? []) {
    const def = componentById(ctx.pack, id);
    if (!def) continue;
    const params = { id: def.id, name: def.name };
    if (!TRANSACTION_KINDS.includes(def.kind) || def.kind === 'actionCard' || (def.kind === 'exploration' && !staysInPlay(def))) warn(ctx, violation('transactionKind', params));
    else if (def.kind === 'promissory' && (notes += 1) === 2) warn(ctx, violation('transactionNotes', {}));
    if (!holds(holdingsOfCards(ctx.board.players[from]?.cards ?? {}), def)) {
      warn(ctx, violation('componentNotHeld', { ...params, context: 'transaction' }, 'transaction'));
      continue;
    }
    lose(ctx, def, from);
    gain(ctx, def, {}, to);
    (moved.components ??= []).push(id);
  }
  const have = ctx.board.players[from];
  const tradeGoods = goods.tradeGoods ?? 0;
  if (tradeGoods > (have?.tradeGoods ?? 0)) warn(ctx, violation('shortTradeGoods', { needed: tradeGoods, have: have?.tradeGoods ?? 0 }, 'transaction'));
  const commodities = goods.commodities ?? 0;
  if (commodities > (have?.commodities ?? 0)) warn(ctx, violation('shortCommodities', { needed: commodities, have: have?.commodities ?? 0 }));
  const movedGoods = Math.min(tradeGoods, have?.tradeGoods ?? 0);
  const movedCommodities = Math.min(commodities, have?.commodities ?? 0);
  if (movedGoods > 0 || movedCommodities > 0) {
    emit(ctx, [{ type: 'GoodsTransferred', from, to, ...(movedGoods > 0 ? { tradeGoods: movedGoods } : {}), ...(movedCommodities > 0 ? { commodities: movedCommodities } : {}) }], { quiet: true });
  }
  if (movedGoods > 0) moved.tradeGoods = movedGoods;
  if (movedCommodities > 0) moved.commodities = movedCommodities;
  return moved;
}

function transactions(ctx: Ctx, acts: Act[]): void {
  const dealtWith = new Set<string>();
  for (const act of acts) {
    if (act.kind !== 'transaction') continue;
    // One transaction with each neighbour in a turn (94.1).
    if (dealtWith.has(act.with)) warn(ctx, violation('transactionRepeated', { player: act.with }));
    dealtWith.add(act.with);
    const other = ctx.table.players.find(p => legacyKey(ctx.table, p.id) === act.with)?.id;
    if (other === undefined || other === ctx.player) continue;
    // Only with a neighbour, as the board stands at this point of the turn (94.1, 60).
    if (!areNeighbours(ctx.table, ctx.board, ctx.pack, ctx.player, other)) warn(ctx, violation('notNeighbor', { player: act.with }));
    const gave = hand(ctx, ctx.player, other, act.give);
    const got = hand(ctx, other, ctx.player, act.get);
    // A card is asked once however many copies of it are in play (my own Support for the Throne beside a received one).
    hook(ctx, 'dealt', [ctx.player], { side: 'give', self: ctx.player, partner: other, gave, got }, { once: true });
    hook(ctx, 'dealt', [other], { side: 'get', self: other, partner: ctx.player, gave: got, got: gave }, { once: true });
  }
}

/** The slice is taken once, whoever holds it (expedition 2, 5); then its cost is paid (expedition 4). Its warnings are the expedition's own. */
function expedition(ctx: Ctx, part: Extract<Act, { kind: 'expedition' }>): void {
  const slice = EXPEDITION_SLICES.find(s => s.id === part.sliceId);
  if (slice) {
    if (ctx.board.common.expedition[slice.id] !== undefined) warn(ctx, violation('sliceTaken', { sliceId: slice.id }, 'expedition'));
    else emit(ctx, [{ type: 'ExpeditionSliceTaken', player: ctx.player, slice: slice.id }], { quiet: true });
  }
  const state = checkView(ctx).state;
  if (slice?.techPlanet) {
    // One of my ready planets with a technology specialty is exhausted (expedition 4.5); the value does not matter.
    if (!part.payment.planets.some(id => techSlicePlanets(state, ctx.pack).includes(id))) warn(ctx, violation('expeditionUnpaid', { sliceId: slice.id }, 'expedition'));
    checkedPay(ctx, { planets: part.payment.planets, tradeGoods: 0 }, 'resources', 'expedition');
    return;
  }
  const cost = slice?.cost;
  if (cost?.kind === 'tradeGoods') {
    // The cost is paid in trade goods only; the payment's planets are not used.
    const have = ctx.board.players[ctx.player]?.tradeGoods ?? 0;
    if (have < cost.amount) warn(ctx, violation('shortTradeGoods', { needed: cost.amount, have }, 'expedition'));
    const spent = Math.min(cost.amount, have);
    if (spent > 0) emit(ctx, [{ type: 'TradeGoodsChanged', player: ctx.player, delta: -spent }], { quiet: true });
    return;
  }
  const kind = cost?.kind ?? 'resources';
  const paid = checkedPay(ctx, part.payment, kind, 'expedition');
  if (cost) shortOf(ctx, kind, cost.amount, paid, 'expedition');
}

export function turnActs(ctx: Ctx): void {
  const acts = actsOf(ctx);
  transactions(ctx, acts);
  const parts = acts.filter((act): act is Extract<Act, { kind: 'expedition' }> => act.kind === 'expedition');
  if (parts.length > 0) begin(ctx, 'expedition');
  parts.forEach((act, i) => {
    // No more than one slice per turn (expedition 5).
    if (i > 0 && act.sliceId) warn(ctx, violation('expeditionTwicePerTurn', { sliceId: act.sliceId }, 'expedition'));
    expedition(ctx, act);
    // Whoever performs an expedition gains their faction's breakthrough, if they do not have it (Thunder's Edge, expedition 3).
    if (!act.sliceId) return;
    const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
    const id = breakthroughOf(ctx.pack, faction);
    if (id === undefined || ctx.board.players[ctx.player]?.cards[id] !== undefined) return;
    emit(ctx, [{ type: 'CardGained', player: ctx.player, card: id }], { quiet: true });
    hook(ctx, 'gained', [ctx.player], {}, { only: [id] });
  });
}
