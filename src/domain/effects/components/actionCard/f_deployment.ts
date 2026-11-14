/**
 * Frontline Deployment (action card; "Action"): "Place 3 infantry from your reinforcements on 1 planet you control."
 *
 * Decided: `play`. A component action that puts 3 infantry on the planet chosen (`choices.planet`), all three on that
 * one planet (ruling). A planet the player does not control is warned of by `placeOnPlanet` (`placeNotControlled`,
 * 67.4.1); the infantry are placed all the same, as a warning forbids nothing.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_deployment';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planet = String(ctx.choices.planet ?? '');
    if (!planet) return [];
    if (ctx.board.planets[planet]?.owner !== ctx.holder) ctx.warn(violation(placeNotControlled.code, { planetId: planet }, 'component'));
    return [placeUnits(ctx.holder, { planet }, { infantry: 3 })];
  },
};
