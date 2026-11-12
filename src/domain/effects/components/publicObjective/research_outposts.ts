/**
 * Found Research Outposts (public objective, stage I): "Control 3 planets that have technology specialties."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * control 3 planets with a technology specialty. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:research_outposts';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
