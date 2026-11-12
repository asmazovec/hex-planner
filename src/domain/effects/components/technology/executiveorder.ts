/**
 * "ACTION: Exhaust this card and draw the top or bottom card of the Agenda deck. Players immediately vote on this
 * agenda as if you were the speaker; you can spend trade goods and resources on this agenda as if they were
 * votes."
 *
 * Hint. The agenda and its vote are not counted. Exhausting it is the common rule of a card whose text says
 * "Exhaust this card", already replayed.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:executiveorder';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
