/**
 * Intimidate Council (public objective, stage I): "Have 1 or more ships in 2 systems that are adjacent to Mecatol
 * Rex's system."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * ships in 2 systems adjacent to the Mecatol Rex system. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:intimidate';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
