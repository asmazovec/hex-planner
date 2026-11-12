/**
 * Omniopiares (Council Keleres mech): "Other players must spend 1 influence to commit ground forces to the planet that
 * contains this unit."
 *
 * Decided: passive, answered at another player's landing (`onLanding`): a landing on a planet where the owner has
 * mechs owes 1 influence per mech (ruling: separate payments), warned of as the custodians token is (`shortInfluence`
 * at the invasion), since the plan records no influence spent on a landing. The owner's own landings cost nothing.
 */
import { violation } from '../../../rules/registry';
import '../../points/rivals';
import type { ComponentEffect } from '../../types';

export const id = 'mech:keleres_mech';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onLanding: ({ planetId, landed, state, warnings }) => {
    const mechs = state.ground[planetId]?.mech ?? 0;
    if (landed > 0 && mechs > 0) warnings.push(violation('shortInfluence', { needed: mechs, paid: 0, planetId }, 'invasion'));
  },
};
