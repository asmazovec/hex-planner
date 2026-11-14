/**
 * Rise of a Messiah (action card, Action): "Place 1 infantry from your reinforcements on each planet you control."
 *
 * Pass 2 makes it a `play`: one infantry from the reinforcements on each planet the player controls when it is
 * resolved. Written in pass 2.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:messiah';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => ctx.my.planets().map(planet => placeUnits(ctx.holder, { planet: planet.id }, { infantry: 1 })),
};
