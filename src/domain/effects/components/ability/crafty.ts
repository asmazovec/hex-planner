/**
 * Crafty (Yssaril Tribes): "You can have any number of action cards in your hand. Game effects cannot prevent you
 * from using this ability."
 *
 * Decided: a passive waiver of the check of the hand limit (2.4, `handOverLimit`). It is a waiver, not a new number:
 * the limit is removed altogether, so the warning is still made and listed, lifted by Crafty. "Game effects cannot
 * prevent you" needs nothing more: no effect of the plan lowers the limit below what a waiver lifts.
 */
import handOverLimit from '../../../rules/codes/handOverLimit';
import type { ComponentEffect } from '../../types';

export const id = 'ability:crafty';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{ code: handOverLimit.code, rule: 'You can have any number of action cards in your hand.' }],
};
