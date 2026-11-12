/**
 * Political Censure (law): "The elected player gains this card and 1 victory point. The elected player cannot play
 * action cards. If the owner of this card loses this card, they lose 1 victory point."
 *
 * Decided: mixed (play and a new check). The elected player gains 1 victory point, and loses it with the card; the
 * elected player cannot play action cards, a check the replay does not make yet (a new code). Pass 1 keeps it a hint;
 * the tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:censure';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
