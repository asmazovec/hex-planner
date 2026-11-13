/**
 * Transparasteel Plating (Yssaril, faction technology): "During your turn of the action phase, players that have
 * passed cannot play action cards."
 *
 * A hint: the action cards other players play during my turn are not planned.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:tp';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
};
