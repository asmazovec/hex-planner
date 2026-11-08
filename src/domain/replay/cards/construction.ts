/** Construction (LRR 24): structures on my planets; before Thunder's Edge the secondary leaves its token in the chosen system. */
import { violation } from '../../rules/registry';
import type { CardHandler } from './handler';

export const construction: CardHandler = {
  apply: ({ game, state, entry, primary, warnings }) => {
    if (primary) return;
    const effects = entry.effects ?? {};
    // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
    if (effects.systemId && !game.expansions.includes('te')) {
      // TODO(P2-018) #ws:command-tokens #type:bug #rule:20.6 #test:020-command-tokens #size:s #construction — Второстепенное Construction в систему с моим жетоном законно (жетон уходит в снабжение), а здесь предупреждение
      if (state.tokensOnMap.includes(effects.systemId)) warnings.push(violation('systemHasToken', { systemId: effects.systemId }, 'card'));
      else state.tokensOnMap.push(effects.systemId);
    }
    // The secondary places a structure only and the editor no longer offers units; a plan saved with them keeps them, and is told.
    if (effects.production) warnings.push(violation('constructionUnits', {}));
  },
};
