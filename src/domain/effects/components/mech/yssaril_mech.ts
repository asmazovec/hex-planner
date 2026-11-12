/**
 * Blackshade Infiltrator (Yssaril, mech): "DEPLOY: After you use your Stall Tactics faction ability, you may place
 * 1 mech on a planet you control."
 *
 * Pass 2: a `play` named in `uses` of the Stall Tactics component action: one mech from the reinforcements on the
 * planet of its choices, if the player controls it. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:yssaril_mech';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
