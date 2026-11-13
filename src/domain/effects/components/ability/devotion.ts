/**
 * Devotion (Yin Brotherhood): "After each space combat round: You may destroy 1 of your cruisers or destroyers in
 * the active system to produce 1 hit and assign it to 1 of your opponent's ships in that system."
 *
 * A hint at combat: a hit after a round of space combat; the ships destroyed are entered as the losses of the
 * action.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:devotion';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['combat'],
};
