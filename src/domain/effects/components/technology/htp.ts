/**
 * Hegemonic Trade Policy (Winnu, technology): "Exhaust this card when 1 or more of your units use PRODUCTION; swap the
 * resource and influence values of 1 planet you control during that use of Production."
 *
 * Decided: `play` with a waiver. The technology is named in `uses` of the entry that produces (the replay exhausts it);
 * the `shortResources` warning of that production is lifted when the swap of one paying planet covers the shortfall
 * (its influence less its resources, for the best planet of the payment). Ruling 1 (it changes the Production value
 * of a dock on that planet) is not modelled.
 */
import { planetValue } from '../../../payment';
import { readyToPlay } from '../../../replay/holdings';
import { coverOf } from '../../shortfall';
import type { ComponentEffect } from '../../types';

export const id = 'technology:htp';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'shortResources',
    rule: 'swap the resource and influence values of 1 planet you control during that use of Production',
    // The swap of the one best paying planet (its influence less its resources) must cover what is short.
    // Together with the other components that cover a shortfall (`coverOf`): the swap of the best paying planet is one part.
    when: ({ params }, ctx) => readyToPlay(ctx.pack, ctx.before.holdings, ctx.game.faction, ctx.before.control).has(id)
      && Number(params.needed) - Number(params.paid) <= coverOf(ctx),
  }],
};
