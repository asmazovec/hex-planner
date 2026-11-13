/**
 * "At the start of the strategy phase: Replenish your commodities, then gain 1 trade good."
 *
 * Passive, on the hook `onRoundStart` (points/moments.ts): at the start of every round the replay reaches, the Keleres
 * replenish their commodities (with what the components in force add to a replenish) and gain 1 trade good.
 */
import { gain } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:council_patronage';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'anyone',
  on: {
    // Mandatory, every round; at full commodities the replenish gives none, the trade good still comes (Keleres, Council Patronage 1).
    onRoundStart: ctx => {
      // The replenish (21.3) and what the components add to it (Minister of Commerce: a trade good for each neighbour, LRR 60).
      const missing = ctx.commodityValue(ctx.holder) - ctx.my.commodities;
      const neighbours = (): number => ctx.table.players.filter(other => other.id !== ctx.holder && ctx.neighbours(ctx.holder, other.id)).length;
      const bonus = ctx.applied('tradeGoodsOnReplenish', 0, { faction: ctx.my.faction, get neighbours() { return neighbours(); } });
      return [
        ...(missing > 0 ? [{ type: 'CommoditiesChanged' as const, player: ctx.holder, delta: missing }] : []),
        gain.tradeGoods(ctx.holder, bonus + 1),
      ];
    },
  },
};
