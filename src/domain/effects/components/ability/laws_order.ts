/**
 * "At the start of any player's turn: You may spend 1 trade good or 1 commodity to treat all laws as blank until the
 * end of that turn."
 *
 * Play, named in `uses` of a turn: it costs 1 trade good, or 1 commodity when there is no trade good (the player
 * says which only by what they hold; the sum is what the plan counts). A faction sheet ability is not checked by
 * `holds`, so the play checks the faction itself. That the laws are blank for the turn changes nothing yet: no law
 * has an effect file, so there is nothing to blank (the test is a todo).
 */
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'ability:laws_order';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, state, warnings }) => {
    if (!game.faction.startsWith('keleres')) return;
    if (state.tradeGoods > 0) state.tradeGoods -= 1;
    else if (state.commodities > 0) state.commodities -= 1;
    else warnings.push(violation('shortTradeGoods', { needed: 1, have: 0 }, 'component'));
  },
};
