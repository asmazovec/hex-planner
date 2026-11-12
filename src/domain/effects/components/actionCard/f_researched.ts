/**
 * Focused Research (action card; "Action"): "Spend 4 trade goods to research 1 technology"
 *
 * Decided: `play`. A component action that researches the technology chosen (`choices.technology`, a component id)
 * through `researchTechnologies` (already owned: `researchOwned`, 90.10; prerequisites: `prerequisitesMissing`, as the
 * ruling asks) and spends 4 trade goods. Fewer than four is warned of (`shortTradeGoods`; by the ruling the card cannot
 * be played then); the research is made all the same.
 */
import { researchTechnologies } from '../../../replay/research';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_researched';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'technology', kind: 'component', options: ({ pack }) => Object.keys(pack.technologies).map(tech => `technology:${tech}`) }],
  play: ({ game, state, shared, choices, pack, warnings }) => {
    if (state.tradeGoods < 4) warnings.push(violation('shortTradeGoods', { needed: 4, have: state.tradeGoods }, 'component'));
    state.tradeGoods = Math.max(0, state.tradeGoods - 4);
    const technology = String(choices.technology ?? '');
    if (technology) researchTechnologies(game, state, shared, [technology], pack, warnings);
  },
};
