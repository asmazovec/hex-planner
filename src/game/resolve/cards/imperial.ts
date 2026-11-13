/** Imperial (LRR 45): the primary gains a victory point to a player who controls Mecatol Rex, who must take it (45 note 3). */
import { MECATOL_PLANETS } from '../../../domain/mecatol';
import { ownerOf } from '../../queries';
import { emit } from '../context';
import type { CardRule } from './rule';

export const imperial: CardRule = {
  apply: ({ ctx, primary }) => {
    if (!primary || !MECATOL_PLANETS.some(id => ownerOf(ctx.board, id) === ctx.player)) return;
    emit(ctx, [{ type: 'PointsChanged', player: ctx.player, delta: 1 }], { quiet: true });
  },
};
