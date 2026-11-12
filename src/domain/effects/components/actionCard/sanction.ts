/**
 * Sanction (action card, agenda phase). "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, each player that voted for that outcome returns 1 command
 * token from their fleet supply to their reinforcements."
 *
 * Decided: a hint with no step. Votes and outcomes are not counted by the plan; the tokens other players lose depend
 * on how they voted, which the plan does not know. A player who loses a token enters it by hand (an adjustment).
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:sanction';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
