/**
 * Rise of a Messiah (action card, Action): "Place 1 infantry from your reinforcements on each planet you control."
 *
 * Pass 2 makes it a `play`: one infantry from the reinforcements on each planet the player controls when it is
 * resolved. Written in pass 2.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:messiah';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => ctx.my.planets().map(planet => placeUnits(ctx.holder, { planet: planet.id }, { infantry: 1 })),
};
