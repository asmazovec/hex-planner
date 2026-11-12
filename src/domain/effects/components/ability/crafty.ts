/**
 * Crafty (Yssaril Tribes): "You can have any number of action cards in your hand. Game effects cannot prevent you
 * from using this ability."
 *
 * Pass 2: a `passive` waiver of the new check of the hand limit (2.4). Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:crafty';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
