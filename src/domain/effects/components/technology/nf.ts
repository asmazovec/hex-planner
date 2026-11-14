/**
 * Nullification Field (Xxcha, technology): "After another player activates a system that contains 1 or more of your
 * ships, you may exhaust this card and spend 1 token from your strategy pool; immediately end that player's turn."
 *
 * Decided: `play`. The ended turn is another player's and is not planned, but the token is: an entry of the player that
 * names the technology in `uses` (the replay exhausts it) spends 1 strategy token, warned of when the pool has none
 * (`shortStrategy`).
 */
import type { Hooked } from '../../../../game/abilities/types';
import { spendStrategyBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'technology:nf';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  // The cancelled card (the ended turn) is another player's and not planned; the token is the Xxcha player's.
  play: ctx => (ctx.held && ctx.my.faction === 'xxcha' ? spendStrategyBy(ctx) : []),
};
