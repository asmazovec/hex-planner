/**
 * "At the start of any player's turn: You may spend 1 trade good or 1 commodity to treat all laws as blank until the
 * end of that turn."
 *
 * Play, named in `uses` of a turn: it costs 1 trade good, or 1 commodity when there is no trade good (the player
 * says which only by what they hold; the sum is what the plan counts). A faction sheet ability is not checked by
 * `holds`, so the play checks the faction itself. That the laws are blank for the turn changes nothing yet: no law
 * has an effect file, so there is nothing to blank (the test is a todo).
 */
import { commodities, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { violation } from '../../../rules/registry';

export const id = 'ability:laws_order';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    if (!ctx.my.faction.startsWith('keleres')) return [];
    if (ctx.my.tradeGoods > 0) return [tradeGoods(ctx.holder, -1)];
    if (ctx.my.commodities > 0) return [commodities(ctx.holder, -1)];
    ctx.warn(violation('shortTradeGoods', { needed: 1, have: 0 }, 'component'));
    return [];
  },
};
