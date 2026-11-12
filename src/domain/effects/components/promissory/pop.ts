/**
 * Promise of Protection (Mentak Coalition, promissory note): "ACTION: Place this card faceup in your play area.
 * While this card is in your play area, the Mentak player cannot use their Pillage faction ability against you. If
 * you activate a system that contains 1 or more of the Mentak player's units, return this card to the Mentak
 * player."
 *
 * Decided: a hint. It stops Pillage, which takes another player's trade goods after their transaction: the plan does
 * not count Pillage, so there is nothing to lift. Its return to the Mentak player on activation is not modelled.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:pop';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['transaction'] };
