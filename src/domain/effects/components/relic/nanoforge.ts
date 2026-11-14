/**
 * Nano-Forge (relic): "ACTION: Attach this card to a non-legendary, non-home planet you control, its resource and
 * influence values are increased by 2 and it is a legendary planet. This action cannot be performed once attached."
 *
 * Decided (pass 2): play (`choices.planetId` attaches it, in the shared `attachments`) and a modify of
 * `planetResources` and `planetInfluence` (+2) of the planet it is attached to; a target that is not mine, a home planet
 * or a legendary one is warned of, and so is a second play. Pass 1 keeps it the hint it is today.
 */
import { violation } from '../../../rules/registry';
import attachTarget from '../../../rules/codes/attachTarget';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'relic:nanoforge';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  modify: {
    planetResources: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value),
    planetInfluence: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value),
  },
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planetId = String(ctx.choices.planetId ?? '');
    if (!ctx.held || !planetId) return [];
    // "This action cannot be performed once attached."
    if (Object.values(ctx.board.planets).some(planet => planet.attached.includes(id))) {
      ctx.warn(violation(attachTarget.code, { planetId }));
      return [];
    }
    const reason = ctx.board.planets[planetId]?.owner !== ctx.holder ? 'notControlled'
      : ctx.tileKind(ctx.systemOf(planetId) ?? '') === 'home' ? 'home'
        : ctx.pack.planets[planetId]?.legendary !== undefined ? 'legendary' : undefined;
    if (reason) ctx.warn(violation(attachTarget.code, { planetId, reason }));
    return [{ type: 'CardAttached', planet: planetId, card: id }];
  },
};
