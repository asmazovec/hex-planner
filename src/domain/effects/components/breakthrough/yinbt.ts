/**
 * Yin Ascendant (Yin, breakthrough): "When you gain this card or score a public objective, gain the alliance
 * ability of a random, unused faction."
 *
 * A hint: the alliance ability gained is random, so the plan cannot know it.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:yinbt';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
