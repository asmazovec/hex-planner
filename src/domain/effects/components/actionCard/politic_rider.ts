/**
 * Politics Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, draw 3 action cards and gain the speaker token."
 *
 * A hint without a step: votes and predictions are cast in the agenda phase, which the plan does not replay; the
 * action cards and the speaker token are entered by hand (gains).
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:politic_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
