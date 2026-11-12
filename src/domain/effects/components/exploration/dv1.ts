/**
 * Derelict Vessel, a frontier exploration card: "Draw 1 secret objective."
 *
 * Decided: a hint. The plan holds secret objectives already: the one drawn is entered in the gains of the entry, as
 * only the player knows which it is, and the card adds nothing to that. A frontier token is explored with Dark Energy
 * Tap or another effect (LRR 35.4), which the plan does not model, and the limit of three secrets scored (its note: a
 * fourth is drawn and shuffled back) is not counted. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:dv1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
