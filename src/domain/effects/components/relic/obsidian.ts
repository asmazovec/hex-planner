/**
 * The Obsidian (relic): "When you gain this card, draw 1 secret objective. You can have 1 additional scored or unscored
 * secret objective."
 *
 * Decided (pass 2): passive, a modify of a new point, the secret objective limit (3 by 61.21 and 45.4, plus 1), checked
 * by a new warning of the secret objectives held and scored beyond it. The objective drawn is entered as a gain. Pass 1
 * keeps it the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:obsidian';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { secretLimit: value => value + 1 },
};
