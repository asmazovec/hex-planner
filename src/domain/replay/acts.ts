/**
 * The acts of a turn, after its action: the transactions with neighbours (LRR 94) in order, then the expedition at the
 * end of the turn (Thunder's Edge, expedition 2). Nothing is forbidden; what breaks a rule warns.
 */
import { linksOf } from '../movement';
import { areNeighbors } from '../neighbors';
import { violation } from '../rules/registry';
import { componentById, noteBase } from '../components';
import { staysInPlay, TRANSACTION_KINDS } from '../holdings';
import { effectOf, holderOf, inForceOf } from '../effects/registry';
import type { DealTurn } from '../effects/points/payment';
import type { Act, DataPack, Entry, Game, GameState, Goods, Warning } from '../types';
import { commodityValueOf } from './cards/trade';
import { applyExpeditionPart } from './expedition';
import { gain, holds, lose } from './holdings';

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
 * (21.5), a component from the holdings of one to those of the other, by its kind. What the giver lacks warns and
 * stays where it is, goods and components alike: nothing goes below zero and nothing comes from nowhere. A component
 * of a kind a transaction does not move (94.3: only promissory notes; an action card needs an ability, 94.3.1, which
 * lifts the warning) and a second promissory note (69.5) warn and move all the same. `shared` is my state, where the
 * laws of the whole game lie. Returns what moved, commodities counted as the trade goods they become.
 */
function hand(from: GameState, to: GameState, goods: Goods, pack: DataPack, shared: GameState, warnings: Warning[]): Goods {
  let notes = 0;
  const moved: Goods = {};
  for (const id of goods.components ?? []) {
    const def = componentById(pack, id);
    if (!def) continue;
    const params = { id: def.id, name: def.name };
    if (!TRANSACTION_KINDS.includes(def.kind) || def.kind === 'actionCard' || (def.kind === 'exploration' && !staysInPlay(def))) warnings.push(violation('transactionKind', params));
    else if (def.kind === 'promissory' && (notes += 1) === 2) warnings.push(violation('transactionNotes', {}));
    if (!holds(from.holdings, def)) {
      warnings.push(violation('componentNotHeld', { ...params, context: 'transaction' }, 'transaction'));
      continue;
    }
    lose(from, shared, def);
    gain(to, shared, def);
    (moved.components ??= []).push(id);
  }
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
  if (movedGoods > 0) moved.tradeGoods = movedGoods;
  if (movedCommodities > 0) moved.commodities = movedCommodities;
  return moved;
}

/**
 * Asks the components in force of one side of a settled deal for their `dealt` hook. `gave` and `got` are what moved
 * (commodities that arrived are trade goods of the receiver). Each side is seen with its own faction and holder.
 */
function dealt(
  game: Game, entry: Entry, pack: DataPack, ctx: ActContext, warnings: Warning[],
  side: 'give' | 'get', self: string, partner: string, gave: Goods, got: Goods,
): void {
  const shared = ctx.states.me;
  const state = ctx.states[self];
  const other = ctx.states[partner];
  if (!shared || !state || !other) return;
  // In an opponent's entry the game is seen through their eyes: `game.faction` is theirs and I am among its opponents under `me`.
  const faction = self === (entry.owner ?? 'me') ? game.faction : game.opponents.find(p => p.id === self)?.faction ?? game.faction;
  const asked = { faction };
  // A card is asked once however many copies of it are in play (my own Support for the Throne beside a received one).
  const forced = inForceOf(pack, holderOf(asked, state, shared));
  for (const id of forced.filter((found, index) => forced.findIndex(other => noteBase(other) === noteBase(found)) === index)) {
    effectOf(pack, id)?.dealt?.({
      game, pack, entry, side, self, partner, faction, state, other, shared, gave, got,
      commodityValue: commodityValueOf(asked, state, pack, shared), warnings,
    } satisfies DealTurn);
  }
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
    const shared = ctx.states.me ?? state;
    if (!areNeighbors(game, state, other, pack, linksOf(game, pack, { state, shared, during: 'neighbors' }))) warnings.push(violation('notNeighbor', { player: act.with }));
    const gave = hand(state, other, act.give, pack, shared, warnings);
    const got = hand(other, state, act.get, pack, shared, warnings);
    const owner = entry.owner ?? 'me';
    dealt(game, entry, pack, ctx, warnings, 'give', owner, act.with, gave, got);
    dealt(game, entry, pack, ctx, warnings, 'get', act.with, owner, got, gave);
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
