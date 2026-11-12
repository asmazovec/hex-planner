/**
 * "At the start of the strategy phase: Replenish your commodities, then gain 1 trade good."
 *
 * Passive, on the hook `onRoundStart` (points/moments.ts): at the start of every round the replay reaches, the Keleres
 * replenish their commodities (with what the components in force add to a replenish) and gain 1 trade good.
 */
import { replenishWith } from '../../../replay/cards/trade';
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'ability:council_patronage';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // Mandatory, every round; at full commodities the replenish gives none, the trade good still comes (Keleres, Council Patronage 1).
  onRoundStart: turn => {
    replenishWith(turn.game, turn.state, turn.pack, turn.shared, turn.states);
    turn.state.tradeGoods += 1;
  },
};
