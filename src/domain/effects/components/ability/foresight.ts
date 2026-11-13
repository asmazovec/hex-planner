/**
 * Foresight (Naalu Collective): "After another player moves ships into a system that contains 1 or more of your ships:
 * You may place 1 token from your strategy pool in an adjacent system that does not contain another player's ships;
 * move your ships from the active system into that system."
 *
 * A hint at the movement: a reaction in another player's tactical action, which the plan does not replay as a turn of
 * mine. The token and the escape are entered by hand (an adjustment) where the player expects them.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:foresight';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id, hintAt: ['movement'] };
