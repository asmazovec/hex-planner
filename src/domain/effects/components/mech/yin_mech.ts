/**
 * Moyin's Ashes (Yin, mech): "DEPLOY: When you use your Indoctrination faction ability, you may spend 1 additional
 * influence to replace your opponent's unit with 1 mech instead of 1 infantry."
 *
 * A hint at the invasion: it rides on Indoctrination, at the start of a ground combat.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:yin_mech';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['invasion'],
};
