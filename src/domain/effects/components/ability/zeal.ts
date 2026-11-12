/**
 * Zeal (Argent Flight): "You always vote first during the agenda phase. When you cast at least 1 vote: cast 1
 * additional vote for each player in the game including you."
 *
 * A hint: votes are not planned. The agenda phase has no step of the replay, so the reminder has no block.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:zeal';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
