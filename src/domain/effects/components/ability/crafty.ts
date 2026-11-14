/**
 * Crafty (Yssaril Tribes): "You can have any number of action cards in your hand. TableFacts effects cannot prevent you
 * from using this ability."
 *
 * Decided: a passive waiver of the check of the hand limit (2.4, `handOverLimit`). It is a waiver, not a new number:
 * the limit is removed altogether, so the warning is still made and listed, lifted by Crafty. "TableFacts effects cannot
 * prevent you" needs nothing more: no effect of the plan lowers the limit below what a waiver lifts.
 */
import handOverLimit from '../../../rules/codes/handOverLimit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:crafty';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{ code: handOverLimit.code, rule: 'You can have any number of action cards in your hand.' }],
};
