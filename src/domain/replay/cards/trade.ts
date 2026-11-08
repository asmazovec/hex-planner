/** Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token. */
import type { CardHandler } from './handler';
import { CARD } from './ids';

export const trade: CardHandler = {
  apply: ({ state, entry, round, primary }) => {
    if (!primary) return;
    state.tradeGoods += 3;
    const chosen = entry.effects?.freeSecondary ?? [];
    if (chosen.length > 0) round.freeSecondary[CARD.trade] = [...new Set([...(round.freeSecondary[CARD.trade] ?? []), ...chosen])];
  },
};
