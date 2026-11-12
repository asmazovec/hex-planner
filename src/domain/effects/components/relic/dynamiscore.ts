/**
 * Dynamis Core (relic): "While this card is in your play area, your commodity value is increased by 2. ACTION: Gain
 * trade goods equal to your commodity value, then purge this card."
 *
 * Decided (pass 2): passive, a modify of a new point of the count, the commodity value (+2), asked where commodities
 * are replenished (Trade, 92.3, 92.5); and its action gains trade goods equal to that value (the replay already purges
 * the relic). The contract lets only a play effect have `play`, so pass 2 must either let a passive effect answer its
 * own component action or count the action's trade goods elsewhere. Pass 1 keeps it the hint it is today.
 */
import { commodityValueOf } from '../../../replay/cards/trade';
import type { ComponentEffect } from '../../types';

export const id = 'relic:dynamiscore';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { commodityValue: value => value + 2 },
  play: ({ game, state, shared, pack, held }) => {
    if (!held) return;
    // The value with the relic itself in play, whether or not the replay has taken it out of the holdings yet.
    const now = commodityValueOf(game, state, pack, shared);
    const inPlay = state.holdings.relics.includes(id);
    const withRelic = inPlay ? now : now + 2;
    const without = inPlay ? now - 2 : now;
    state.tradeGoods += withRelic;
    // Purged, the relic no longer raises the value: commodities beyond it are returned (Dynamis Core note 1).
    state.commodities = Math.min(state.commodities, without);
  },
};
