/**
 * Economic Initiative (action card; "Action"): "Ready each cultural planet you control."
 *
 * Decided: `play`. A component action that readies planets the plan keeps exhausted: every planet with the cultural
 * trait the player controls when it is played. A planet readied pays again later without the `planetExhausted`
 * warning; that is the effect of the play, not a waiver, as the planet really is ready. Zero cultural planets is
 * allowed (ruling): nothing happens.
 */
import { planet } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:economic_initiative';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => ctx.my.planets().filter(p => p.exhausted && ctx.pack.planets[p.id]?.traits?.includes('cultural')).map(p => planet.ready(ctx.holder, p.id)),
};
