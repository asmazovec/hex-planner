/**
 * Keleres Ship (frontier exploration, Prophecy of Kings): "Gain 2 command tokens."
 *
 * Decided: `play`, named in the `uses` of the entry that explores (35.5, 35.7): the owner gains two command tokens into
 * pools of their choice (20.2). Tokens beyond the sixteen of a faction are warned of as any gain is (`noReinforcements`,
 * 20.3). Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:kel1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
