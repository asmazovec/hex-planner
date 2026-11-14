import type { Game, GameState, DataPack } from '../../../../../domain/types';
import { commodityValueOf } from '../../../../../domain/replay/cards/trade';

/** Gains commodities, no more than the commodity value allows (21.2); returns what was gained. */
export function gainCommodities(game: Pick<Game, 'faction'>, state: GameState, pack: DataPack, amount: number, shared: GameState = state): number {
  const gained = Math.max(0, Math.min(amount, commodityValueOf(game, state, pack, shared) - state.commodities));
  state.commodities += gained;
  return gained;
}
