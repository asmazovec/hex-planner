/**
 * Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token; both the
 * primary and the secondary replenish commodities up to the faction's value (21.3, 92.3, 92.5).
 */
import { applied } from '../../effects/apply';
import '../../effects/points/moments';
import { holderOf } from '../../effects/registry';
import { linksOf } from '../../movement';
import { areNeighbors } from '../../neighbors';
import type { DataPack, Game, GameState } from '../../types';
import type { CardHandler } from './handler';
import { CARD } from './ids';

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

export const trade: CardHandler = {
  apply: ({ game, state, entry, pack, round, primary }) => {
    replenishWith(game, state, pack, round.states.me ?? state, round.states);
    if (!primary) return;
    state.tradeGoods += 3;
    const chosen = entry.effects?.freeSecondary ?? [];
    if (chosen.length > 0) round.freeSecondary[CARD.trade] = [...new Set([...(round.freeSecondary[CARD.trade] ?? []), ...chosen])];
  },
};
