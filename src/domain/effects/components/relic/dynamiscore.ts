/**
 * Dynamis Core (relic): "While this card is in your play area, your commodity value is increased by 2. ACTION: Gain
 * trade goods equal to your commodity value, then purge this card."
 *
 * Decided (pass 2): passive, a modify of a new point of the count, the commodity value (+2), asked where commodities
 * are replenished (Trade, 92.3, 92.5); and its action gains trade goods equal to that value (the replay already purges
 * the relic). The contract lets only a play effect have `play`, so pass 2 must either let a passive effect answer its
 * own component action or count the action's trade goods elsewhere. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:dynamiscore';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
