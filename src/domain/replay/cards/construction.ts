/** Construction (LRR 24): structures on my planets; before Thunder's Edge the secondary leaves its token in the chosen system. */
import productionNotAllowed from '../../rules/codes/productionNotAllowed';
import { violation } from '../../rules/registry';
import type { CardHandler } from './handler';

export const construction: CardHandler = {
  apply: ({ game, state, entry, primary, warnings }) => {
    const effects = entry.effects ?? {};
    // The primary produces nothing either (67.1, 89.5): a production entered on it is warned of, and a law may lift that.
    if (primary) {
      if (effects.production) warnings.push(violation(productionNotAllowed.code, { systemId: effects.production.systemId }));
      return;
    }
    // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
    if (effects.systemId && !game.expansions.includes('te')) {
      // A token placed where one of mine already is goes back to reinforcements (20.6): no warning, still one token.
      if (!state.tokensOnMap.includes(effects.systemId)) state.tokensOnMap.push(effects.systemId);
    }
    // The secondary places a structure only and the editor no longer offers units; a plan saved with them keeps them, and is told.
    if (effects.production) warnings.push(violation('constructionUnits', {}));
  },
};
