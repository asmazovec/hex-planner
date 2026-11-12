/**
 * Minister of War (agenda): "The elected player gains this card. The owner of this card may discard this card after
 * performing an action to remove 1 of their command tokens from the game board and return it to their
 * reinforcements - then they may perform 1 additional action."
 *
 * A hint for now. The additional action and the command token taken back from the board need a turn structure and a
 * choice of system on a discarded law, which the plan does not have.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:minister_war';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
