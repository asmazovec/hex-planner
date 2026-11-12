/**
 * Reflective Shielding (action card). "When one of your ships uses SUSTAIN DAMAGE during combat: Produce 2 hits against
 * your opponent's ships in the active system."
 *
 * Decided: a hint in the combat block (the step its window names). Hits are dice and combat, which the plan does not
 * simulate; the losses are entered by the player.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:reflective';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
