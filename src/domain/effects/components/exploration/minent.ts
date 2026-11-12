/**
 * Minor Entropic Field (frontier exploration, Prophecy of Kings): "Gain 1 command token and 1 trade good."
 *
 * Decided: `play`, named in the `uses` of the entry that explores (35.5, 35.7): the owner gains one command token into a
 * pool of their choice (20.2) and one trade good. A token beyond the sixteen of a faction is warned of as any gain is
 * (`noReinforcements`, 20.3). Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:minent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
