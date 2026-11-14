/**
 * Terraform (Titans of Ul, promissory note): "ACTION: Attach this card to a non-home planet you control other than
 * Mecatol Rex. Its resource and influence values are each increased by 1, and it is treated as having all 3 planet
 * traits (cultural, hazardous, and industrial)."
 *
 * Decided: a passive effect with a `play` (the stacking of a planet's value reads `modify` of passive effects only). Played by a component action with the planet as its choice (`choices.planetId`), it attaches to that
 * planet (`GameState.attachments`), and from then on the planet is worth 1 more resource and 1 more influence wherever
 * a payment counts it. The traits are for exploration, which the plan does not count. Once played it is never returned
 * (Titans of Ul, Terraform note 1).
 */
import attachTarget from '../../../rules/codes/attachTarget';
import { violation } from '../../../rules/registry';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:terraform';

const attached = (ctx: { attached?: readonly string[] }): boolean => ctx.attached?.some(card => card.startsWith(id)) ?? false;

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  // Asked for the planet it is attached to only: a note merely held changes nothing (`ctx.attached` names it).
  modify: {
    planetResources: (value, ctx) => (attached(ctx) ? value + 1 : value),
    planetInfluence: (value, ctx) => (attached(ctx) ? value + 1 : value),
  },
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planetId = String(ctx.choices.planetId ?? '');
    if (!planetId) return [];
    const reason = ctx.board.planets[planetId]?.owner !== ctx.holder ? 'notControlled' : ctx.tileKind(ctx.systemOf(planetId) ?? '') === 'home' ? 'home' : undefined;
    // A target the card does not allow is warned of and gets no bonus: the note is not attached.
    if (reason) {
      ctx.warn(violation(attachTarget.code, { planetId, reason }));
      return [];
    }
    return [{ type: 'CardAttached', planet: planetId, card: ctx.id }];
  },
};
