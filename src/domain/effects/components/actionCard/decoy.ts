/**
 * Decoy Operation (action card). "After another player activates a system that contains 1 or more of your structures:
 * Remove up to 2 of your ground forces from the game board and place them on a planet you control in the active
 * system."
 *
 * Decided: a hint in the activation block (the step its window names). It is played in another player's tactical
 * action, which the plan does not open to my moves; the ground forces moved are entered by hand. Placing my ground
 * forces on a planet I control breaks no rule the replay checks.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:decoy';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id };
