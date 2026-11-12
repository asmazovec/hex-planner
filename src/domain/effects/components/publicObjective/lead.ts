/**
 * Lead From the Front (public objective, stage I): "Spend a total of 3 tokens from your tactic and/or strategy
 * pools."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 3 tokens from the tactic and strategy pools. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:lead';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
