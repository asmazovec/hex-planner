/**
 * Instinct Training (Xxcha, technology): "You may exhaust this card and spend 1 token from your strategy pool when
 * another player plays an action card; cancel that action card."
 *
 * Decided: `play`. The cancelled card is another player's and is not planned, but the token is: an entry of the
 * player that names the technology in `uses` (the replay exhausts it) spends 1 strategy token, warned of when the pool
 * has none (`shortStrategy`).
 */
import type { Ability } from '../../../../game/abilities/types';
import { spendStrategyBy } from '../../helpers/cardPlay';

export const id = 'technology:it';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // The cancelled card (the ended turn) is another player's and not planned; the token is the Xxcha player's.
  play: ctx => (ctx.held && ctx.my.faction === 'xxcha' ? spendStrategyBy(ctx) : []),
};
