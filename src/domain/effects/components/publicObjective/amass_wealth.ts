/**
 * Amass Wealth (public objective, stage I): "Spend 3 influence, 3 resources, and 3 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it pays 3 influence, 3 resources and 3 trade goods, each part apart (61.10); a planet gives one of its values only.
 * Pass 1 keeps it the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:amass_wealth';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
