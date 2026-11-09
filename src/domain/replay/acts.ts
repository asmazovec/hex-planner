/**
 * The acts of a turn, after its action: the transactions with neighbours (LRR 94) in order, then the expedition at the
 * end of the turn (Thunder's Edge, expedition 2). Nothing is forbidden; what breaks a rule warns.
 */
import { areNeighbors } from '../neighbors';
import { violation } from '../rules/registry';
import type { Act, DataPack, Entry, Game, GameState, Goods, Warning } from '../types';
import { applyExpeditionPart } from './expedition';

/** What the acts of every turn share in one replay: the slices taken so far and each player's state, by `me` or id. */
export interface ActContext {
  taken: Set<string>;
  states: Record<string, GameState>;
}

/** The acts an entry holds: only a turn has them. */
export const actsOf = (entry: Entry): Act[] =>
  ('acts' in entry && Array.isArray(entry.acts) ? entry.acts : []);

/**
 * Moves what one side gives to the other: trade goods as trade goods, commodities as trade goods of the receiver
 * (21.5). What the giver lacks warns and stays where it is; nothing goes below zero.
 */
function hand(from: GameState, to: GameState, goods: Goods, warnings: Warning[]): void {
  const tradeGoods = goods.tradeGoods ?? 0;
  if (tradeGoods > from.tradeGoods) warnings.push(violation('shortTradeGoods', { needed: tradeGoods, have: from.tradeGoods }, 'transaction'));
  const movedGoods = Math.min(tradeGoods, from.tradeGoods);
  from.tradeGoods -= movedGoods;
  to.tradeGoods += movedGoods;
  const commodities = goods.commodities ?? 0;
  if (commodities > from.commodities) warnings.push(violation('shortCommodities', { needed: commodities, have: from.commodities }));
  const movedCommodities = Math.min(commodities, from.commodities);
  from.commodities -= movedCommodities;
  to.tradeGoods += movedCommodities;
}

export function applyActs(game: Game, state: GameState, entry: Entry, pack: DataPack, ctx: ActContext, warnings: Warning[]): void {
  const acts = actsOf(entry);
  const dealtWith = new Set<string>();
  for (const act of acts) {
    if (act.kind !== 'transaction') continue;
    // One transaction with each neighbour in a turn (94.1).
    if (dealtWith.has(act.with)) warnings.push(violation('transactionRepeated', { player: act.with }));
    dealtWith.add(act.with);
    const other = ctx.states[act.with];
    if (!other || other === state) continue;
    // Only with a neighbour, as the board stands at this point of the turn (94.1, 60).
    if (!areNeighbors(game, state, other, pack)) warnings.push(violation('notNeighbor', { player: act.with }));
    hand(state, other, act.give, warnings);
    hand(other, state, act.get, warnings);
  }
  let expeditions = 0;
  for (const act of acts) {
    if (act.kind !== 'expedition') continue;
    expeditions += 1;
    // No more than one slice per turn (expedition 5).
    if (expeditions > 1 && act.sliceId) warnings.push(violation('expeditionTwicePerTurn', { sliceId: act.sliceId }));
    applyExpeditionPart(game, state, act, pack, ctx.taken, warnings);
  }
}
