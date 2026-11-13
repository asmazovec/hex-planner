/** Construction (LRR 24): structures on my planets; before Thunder's Edge the secondary leaves its token in the chosen system. */
import productionNotAllowed from '../../../domain/rules/codes/productionNotAllowed';
import { violation } from '../../../domain/rules/registry';
import { emit, warn } from '../context';
import type { CardRule } from './rule';

export const construction: CardRule = {
  apply: ({ ctx, effects, primary }) => {
    // The primary produces nothing either (67.1, 89.5): a production entered on it is warned of, and a law may lift that.
    if (primary) {
      if (effects.production) warn(ctx, violation(productionNotAllowed.code, { systemId: effects.production.systemId }));
      return;
    }
    // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
    if (effects.systemId && !ctx.table.expansions.includes('te')) {
      // A token placed where one of mine already is goes back to reinforcements (20.6): no warning, still one token.
      emit(ctx, [{ type: 'SystemActivated', player: ctx.player, system: effects.systemId }], { quiet: true });
    }
    // The secondary places a structure only and the editor no longer offers units; a plan saved with them keeps them, and is told.
    if (effects.production) warn(ctx, violation('constructionUnits', {}));
  },
};
