/**
 * Archived Secret (agenda, directive): "The elected player draws 1 secret objective."
 *
 * A hint: the vote is at the table, and the secret objective drawn is entered as any card drawn, in the entry's
 * `gains`; nothing is counted or checked by the card itself.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:secret';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
