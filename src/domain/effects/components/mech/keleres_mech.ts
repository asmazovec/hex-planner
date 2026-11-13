/**
 * Omniopiares (Council Keleres mech): "Other players must spend 1 influence to commit ground forces to the planet that
 * contains this unit."
 *
 * Decided: passive, answered at another player's landing (`onLanding`): a landing on a planet where the owner has
 * mechs owes 1 influence per mech (ruling: separate payments), warned of as the custodians token is (`shortInfluence`
 * at the invasion), since the plan records no influence spent on a landing. The owner's own landings cost nothing.
 */
import { violation } from '../../../rules/registry';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:keleres_mech';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'others',
  on: {
    onLanding: (ctx, landing) => {
      const mechs = ctx.my.unitsOn(landing.planetId).mech ?? 0;
      if (landing.landed > 0 && mechs > 0) ctx.warn(violation('shortInfluence', { needed: mechs, paid: 0, planetId: landing.planetId }, 'invasion'));
    },
  },
};
