import { applied } from '../../../../../domain/effects/apply';
import { holderOf } from '../../../../../domain/effects/registry';
import { linksOf } from '../../../../../domain/movement';
import type { DataPack, Game } from '../../../../../domain/types';
import type { GameState } from '../../types';
import { areNeighbors } from '../../neighbors';
/** Gains commodities, no more than the commodity value allows (21.2); returns what was gained. */
export function gainCommodities(game: Pick<Game, 'faction'>, state: GameState, pack: DataPack, amount: number, shared: GameState = state): number {
  const gained = Math.max(0, Math.min(amount, commodityValueOf(game, state, pack, shared) - state.commodities));
  state.commodities += gained;
  return gained;
}

/**
 * The commodity value of the player: the faction's printed value (21.1) after the components that change it
 * (`commodityValue`). `state` is their own, `shared` mine, which keeps the laws.
 */
export const commodityValueOf = (game: Pick<Game, 'faction'>, state: GameState, pack: DataPack, shared: GameState = state): number =>
  applied(pack, holderOf(game, state, shared), 'commodityValue', pack.factions[game.faction]?.commodities ?? 0, { faction: game.faction }).value;

/** Replenishes the commodities up to the commodity value (21.3): never takes any away. */
export function replenish(game: Pick<Game, 'faction'>, state: GameState, pack: DataPack, shared: GameState = state): void {
  state.commodities = Math.max(state.commodities, commodityValueOf(game, state, pack, shared));
}

/**
 * A replenish with what follows it: the trade goods the components in force give after the owner replenishes commodities
 * (the `tradeGoodsOnReplenish` point, Minister of Commerce: one for each neighbour). `states` is every player's, to count the neighbours (LRR 60).
 */
export function replenishWith(game: Game, state: GameState, pack: DataPack, shared: GameState, states: Record<string, GameState>): void {
  replenish(game, state, pack, shared);
  const neighbours = (): number => Object.values(states).filter(other => other !== state
    && areNeighbors(game, state, other, pack, linksOf(game, pack, { state, shared, during: 'neighbors' }))).length;
  state.tradeGoods += applied(pack, holderOf(game, state, shared), 'tradeGoodsOnReplenish', 0, { faction: game.faction, get neighbours() { return neighbours(); } }).value;
}
