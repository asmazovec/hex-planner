/**
 * Industrial Initiative (action card, Action): "Gain 1 trade good for each industrial planet you control."
 *
 * Pass 2 makes it a `play`: the component action gains 1 trade good for each industrial planet its player controls
 * when it is resolved (a planet trait, 64.3). Zero industrial planets is a legal play that gains nothing (tirules2
 * ruling 1). Written in pass 2.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:industrial_initiative';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const industrial = ctx.my.planets().filter(p => ctx.pack.planets[p.id]?.traits?.includes('industrial')).length;
    return industrial > 0 ? [tradeGoods(ctx.holder, industrial)] : [];
  },
};
