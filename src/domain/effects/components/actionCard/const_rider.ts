/**
 * Construction Rider (action card; "After an agenda is revealed"): "You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, place 1 space dock from your reinforcements on a planet you
 * control."
 *
 * A hint with no step: whether the prediction is correct depends on the votes of every player, which the plan does not
 * model, and the agenda phase has no block. A space dock it brings is entered by hand like any other structure placed
 * outside the rules' own moments.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:const_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
