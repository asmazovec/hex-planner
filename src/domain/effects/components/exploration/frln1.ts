/**
 * Freelancers (frontier exploration, Prophecy of Kings): "You may produce 1 unit in this system. You may spend influence
 * as if it were resources to produce this unit."
 *
 * Decided: `play` with waivers, named in the `uses` of the tactical action that explores the system. The production
 * checks of the rules stand for everyone: no unit with Production in the system (`noProduction`, 67.1) and resources
 * short of the cost (`shortResources`, 67.2, 68.1). The card lifts the first for exactly one unit produced in the
 * active system, and the second where the influence of the planets spent, with the trade goods, covers the cost (a
 * planet gives its influence or its resources, not both: exploration notes, Freelancers 1). Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:frln1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
