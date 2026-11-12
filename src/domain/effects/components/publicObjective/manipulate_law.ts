/**
 * Manipulate Galactic Law (public objective, stage II): "Spend 16 influence."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it pays 16 influence from the status entry's payment (61.10); less is shortInfluence.
 * Pass 1 keeps it the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:manipulate_law';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
