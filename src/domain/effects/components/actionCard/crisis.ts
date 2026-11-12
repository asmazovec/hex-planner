/**
 * Crisis (action card, Thunder's Edge): "Skip the next player's turn." Window: at the end of any player's turn, if
 * there are at least 2 players who have not passed.
 *
 * A hint without a step: the plan does not order the turns of the players, so a skipped turn changes nothing it counts.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:crisis';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
