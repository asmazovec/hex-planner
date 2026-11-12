/**
 * Leadership Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, gain 3 command tokens."
 *
 * A hint without a step: votes and predictions are cast in the agenda phase, which the plan does not replay; the 3
 * command tokens a correct prediction gains are entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:lead_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
