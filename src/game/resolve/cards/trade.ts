/**
 * Trade (LRR 92): three trade goods on the primary, which also chooses players whose secondary spends no token; both the
 * primary and the secondary replenish commodities up to the faction's value (21.3, 92.3, 92.5), and the components in
 * force may give trade goods for it (the `tradeGoodsOnReplenish` point, one for each neighbour).
 */
import '../../../domain/effects/points/moments';
import { CARD } from '../../../domain/replay/cards/ids';
import { appliedOn } from '../../abilities/registry';
import { playerOfKey } from '../../keys';
import { areNeighbours } from '../../queries';
import { emit } from '../context';
import type { CardRule } from './rule';

export const trade: CardRule = {
  apply: ({ ctx, effects, primary }) => {
    const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
    const have = ctx.board.players[ctx.player]?.commodities ?? 0;
    const value = appliedOn(ctx.table, ctx.board, ctx.pack, ctx.player, 'commodityValue', ctx.pack.factions[faction]?.commodities ?? 0, { faction }).value;
    const neighbours = (): number => ctx.table.players.filter(other => other.id !== ctx.player && areNeighbours(ctx.table, ctx.board, ctx.pack, ctx.player, other.id)).length;
    const bonus = appliedOn(ctx.table, ctx.board, ctx.pack, ctx.player, 'tradeGoodsOnReplenish', 0, { faction, get neighbours() { return neighbours(); } }).value;
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
