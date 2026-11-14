/**
 * Quash (Xxcha, faction ability): "When an agenda is revealed: You may spend 1 token from your strategy pool to discard
 * that agenda and reveal 1 agenda from the top of the deck. Players vote on this agenda instead."
 *
 * Decided: `play`. Agendas are not planned, but the token is: an agenda-phase entry that plays Quash spends 1 strategy
 * token, warned of when the pool has none (`shortStrategy`). It may be used again on the replacement agenda (ruling 3).
 */
import type { Ability } from '../../../../game/abilities/types';
import { spendStrategyBy } from '../../helpers/cardPlay';

export const id = 'ability:quash';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => (ctx.held && ctx.my.faction === 'xxcha' ? spendStrategyBy(ctx) : []),
};
