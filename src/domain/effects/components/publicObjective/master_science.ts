/**
 * Master the Sciences (public objective, stage II): "Own 2 technologies in each of 4 colors."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: scoring it in the status phase (81.1) is checked against the board before the entry; unmet is the new warning objectiveUnmet (61.5.1).
 * Pass 1 keeps it the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:master_science';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
