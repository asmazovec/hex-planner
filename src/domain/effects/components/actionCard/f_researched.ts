/**
 * Focused Research (action card; "Action"): "Spend 4 trade goods to research 1 technology"
 *
 * Decided: `play`. A component action that researches the technology chosen (`choices.technology`, a component id)
 * through `researchTechnologies` (already owned: `researchOwned`, 90.10; prerequisites: `prerequisitesMissing`, as the
 * ruling asks) and spends 4 trade goods. Fewer than four is warned of (`shortTradeGoods`; by the ruling the card cannot
 * be played then); the research is made all the same.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_researched';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'technology', kind: 'component', options: ({ pack }) => Object.keys(pack.technologies).map(tech => `technology:${tech}`).filter(tech => componentById(pack, tech) !== undefined) }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const have = ctx.my.tradeGoods;
    if (have < 4) ctx.warn(violation('shortTradeGoods', { needed: 4, have }, 'component'));
    const events = have > 0 ? [tradeGoods(ctx.holder, -Math.min(4, have))] : [];
    const technology = String(ctx.choices.technology ?? '');
    return technology ? [...events, ...ctx.after(events).research(technology)] : events;
  },
};
