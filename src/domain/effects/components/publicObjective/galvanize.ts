/**
 * Galvanize the People (public objective, stage II): "Spend a total of 6 tokens from your tactic and/or strategy pools."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it takes 6 tokens from the tactic and strategy pools (61.10); fewer is objectiveUnmet.
 * Pass 1 keeps it the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:galvanize';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
