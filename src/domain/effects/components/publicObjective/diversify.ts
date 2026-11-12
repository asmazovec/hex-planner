/**
 * Diversify Research (public objective, stage I): "Own 2 technologies in each of 2 colors."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * own 2 technologies in each of 2 colours. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:diversify';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
