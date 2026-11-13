/**
 * Ghost Squad (action card). "After another player commits units to land on a planet you control: Move any number of
 * your ground forces from any planet you control in the active system to any other planet you control in the active
 * system."
 *
 * Decided: a hint in the invasion block (the step its window names). It is played in another player's tactical
 * action, between their commitment and the ground combat; the plan cannot put my move into an opponent's entry, and a
 * move between my own planets of one system breaks no rule the replay checks. Nothing is lifted or counted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:ghost_squad';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id };
