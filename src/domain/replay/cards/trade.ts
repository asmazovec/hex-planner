/**
 * Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token; both the
 * primary and the secondary replenish commodities up to the faction's value (21.3, 92.3, 92.5).
 */
import { applied } from '../../effects/apply';
import { holderOf } from '../../effects/registry';
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

/** Gains commodities, no more than the commodity value allows (21.2); returns what was gained. */
export function gainCommodities(game: Pick<Game, 'faction'>, state: GameState, pack: DataPack, amount: number, shared: GameState = state): number {
  const gained = Math.max(0, Math.min(amount, commodityValueOf(game, state, pack, shared) - state.commodities));
  state.commodities += gained;
  return gained;
}

export const trade: CardHandler = {
  apply: ({ game, state, entry, pack, round, primary }) => {
    replenish(game, state, pack, round.states.me);
    if (!primary) return;
    state.tradeGoods += 3;
    const chosen = entry.effects?.freeSecondary ?? [];
    if (chosen.length > 0) round.freeSecondary[CARD.trade] = [...new Set([...(round.freeSecondary[CARD.trade] ?? []), ...chosen])];
  },
};
