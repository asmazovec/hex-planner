/**
 * Gift of Prescience (Naalu Collective, promissory note): "At the end of the Strategy Phase: Place this card faceup in
 * your play area and place the Naalu '0' token on your strategy card, you are the first in initiative order. ...
 * Return this card to the Naalu player at the end of the status phase."
 *
 * A hint at the round: the plan keeps no initiative order (the entries stand in the order the player writes them), so
 * there is nothing to count. The return at the end of the status phase is not replayed.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:gift';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
