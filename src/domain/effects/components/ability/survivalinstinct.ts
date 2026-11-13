/**
 * Survival Instinct (Ral Nel Consortium, ability): "After another player activates a system that contains your ships:
 * you may move up to 2 of your ships into the active system from adjacent systems that do not contain your command
 * tokens."
 *
 * Decided: a reminder at activation. The move happens in another player's turn, and the plan has no entry for a move
 * of mine outside my own tactical action (a rival's tactical action moves the rival's units only), so there is nothing
 * to check it against. The ships moved out of a gravity rift roll for removal (Survival Instinct note 1): a roll.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:survivalinstinct';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id, hintAt: ['activation'] };
