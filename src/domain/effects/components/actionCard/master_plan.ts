/**
 * Master Plan (action card). "After you perform an action: Perform an additional action."
 *
 * Decided: a hint with no step. The plan lists a player's actions in order and does not group them into turns, so no
 * check says "one action per turn" (LRR 3.1); there is nothing to lift. The rulings that matter (it cannot be used
 * to pass in the same turn, effects at the start or end of a turn do not trigger between the two actions) speak of
 * turns, which the replay does not track either.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:master_plan';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
