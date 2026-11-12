/**
 * Support for the Throne (promissory note): "When you receive this card, if you are not the <color> player, you must
 * place it faceup in your play area and gain 1 victory point. When you activate a system that contains 1 or more of
 * the <color> player's units, or if the <color> player is eliminated, lose 1 victory point and return this card to
 * the <color> player."
 *
 * To be automatic, with no choice: the plan counts victory points (`vp`) and holdings. Receiving another player's note
 * in the plan (a transaction, `gains`) gives 1 point; activating a system that holds any unit of its owner, structures
 * alone included (promissory notes, Support for the Throne 2, 4), takes the point back and returns the card. A note
 * held when the plan begins is already in the points entered by hand. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:<color>_sftt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
