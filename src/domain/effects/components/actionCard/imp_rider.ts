/**
 * Imperial Rider (action card; "After an agenda is revealed"): "You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, gain 1 victory point."
 *
 * A hint with no step: whether the prediction is correct depends on the votes, which the plan does not model, and the
 * agenda phase has no block. A point it brings is entered by hand like any other point outside the status phase.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:imp_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
