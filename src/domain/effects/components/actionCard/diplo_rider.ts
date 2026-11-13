/**
 * Diplomacy Rider (action card; "After an agenda is revealed"): "You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, choose 1 system that contains a planet you control. Each
 * other player places a command token from their reinforcements in that system."
 *
 * A hint with no step: whether the prediction is correct depends on the votes, which the plan does not model, and the
 * agenda phase has no block. The tokens it puts down are the other players'.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:diplo_rider';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
