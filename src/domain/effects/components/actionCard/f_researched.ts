/**
 * Focused Research (action card; "Action"): "Spend 4 trade goods to research 1 technology"
 *
 * Decided: `play`. A component action that researches the technology chosen (`choices.technology`, a component id)
 * and spends 4 trade goods. Fewer than four is warned of (`shortTradeGoods`, the card cannot be played then by the
 * ruling), a technology already owned is warned of (`researchOwned`, 90.10). The prerequisites still apply (ruling),
 * but the replay checks prerequisites for no research yet.
 *
 * Pass 1: the hint it is today; pass 2 writes the play.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_researched';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
