/**
 * "After an agenda is revealed: You cannot vote on this agenda. Predict aloud an outcome of this agenda. If your
 * prediction is correct, draw 1 action card and gain 2 trade goods. Then, return this card to the Keleres player."
 *
 * Hint. The agenda phase is not counted: votes and predictions are no part of the plan, and the agenda phase has
 * no step, so no block shows it. Its return to the Keleres player is the common rule of notes (69.3), already
 * replayed.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:ridera';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
