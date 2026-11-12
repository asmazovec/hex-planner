/**
 * "After an agenda is revealed: You may cast up to 6 additional votes on this agenda. Predict aloud an outcome of
 * this agenda. For each player that abstains or votes for another outcome, gain 1 trade good and 1 command token.
 * Then, purge this card."
 *
 * Hint. Votes, predictions and what the other players vote are not counted; the agenda phase has no step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:keleresheroodlynn';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
