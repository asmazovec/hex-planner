/**
 * Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token; both the
 * primary and the secondary replenish commodities up to the faction's value (21.3, 92.3, 92.5), and the components in
 * force may give trade goods for it (the `tradeGoodsOnReplenish` point, one for each neighbour).
 */
import { applied } from '../../../domain/effects/apply';
import '../../../domain/effects/points/moments';
import { holderOf } from '../../../domain/effects/registry';
import { linksOf } from '../../../domain/movement';
import { areNeighbors } from '../../../domain/neighbors';
import { CARD } from '../../../domain/replay/cards/ids';
import { commodityValueOf } from '../../../domain/replay/cards/trade';
import { playerOfKey } from '../../legacyViews';
import { checkView, emit } from '../context';
import type { CardRule } from './rule';

export const trade: CardRule = {
  apply: ({ ctx, effects, primary }) => {
    const v = checkView(ctx);
    const have = ctx.board.players[ctx.player]?.commodities ?? 0;
    const value = commodityValueOf(v.game, v.state, ctx.pack, v.shared);
    const neighbours = (): number => Object.values(v.views.states).filter(other => other !== v.state
      && areNeighbors(v.game, v.state, other, ctx.pack, linksOf(v.game, ctx.pack, { state: v.state, shared: v.shared, during: 'neighbors' }))).length;
    const bonus = applied(ctx.pack, holderOf(v.game, v.state, v.shared), 'tradeGoodsOnReplenish', 0, { faction: v.game.faction, get neighbours() { return neighbours(); } }).value;
    const goods = bonus + (primary ? 3 : 0);
    emit(ctx, [
      ...(value > have ? [{ type: 'CommoditiesChanged' as const, player: ctx.player, delta: value - have }] : []),
      ...(goods !== 0 ? [{ type: 'TradeGoodsChanged' as const, player: ctx.player, delta: goods }] : []),
    ], { quiet: true });
    const chosen = effects.freeSecondary ?? [];
    if (primary && chosen.length > 0) {
      const players = chosen.map(key => playerOfKey(ctx.table, key) ?? key);
      ctx.track.freeSecondary[CARD.trade] = [...new Set([...(ctx.track.freeSecondary[CARD.trade] ?? []), ...players])];
    }
  },
};
