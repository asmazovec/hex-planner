/**
 * Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token; both the
 * primary and the secondary replenish commodities up to the faction's value (21.3, 92.3, 92.5).
 */
import type { CardHandler } from './handler';
import { CARD } from './ids';

export const trade: CardHandler = {
  apply: ({ game, state, entry, pack, round, primary }) => {
    state.commodities = Math.max(state.commodities, pack.factions[game.faction]?.commodities ?? 0);
    if (!primary) return;
    state.tradeGoods += 3;
    const chosen = entry.effects?.freeSecondary ?? [];
    if (chosen.length > 0) round.freeSecondary[CARD.trade] = [...new Set([...(round.freeSecondary[CARD.trade] ?? []), ...chosen])];
  },
};
