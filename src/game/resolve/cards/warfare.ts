/**
 * Warfare (LRR 99): before Thunder's Edge the primary lifts one of my tokens off the board and gains it, then the pools
 * are rearranged; in Thunder's Edge it starts a free tactical action. The secondary produces at home.
 */
import { emit } from '../context';
import type { CardRule } from './rule';

export const warfare: CardRule = {
  apply: ({ ctx, effects, primary }) => {
    const system = effects.systemId;
    if (primary && system && !ctx.table.expansions.includes('te') && ctx.board.systems[system]?.tokens.includes(ctx.player)) {
      emit(ctx, [{ type: 'TokenReturned', player: ctx.player, system }], { quiet: true });
    }
  },
};
