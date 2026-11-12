/**
 * Telepathic (Naalu Collective): "At the end of the strategy phase: Place the Naalu "0" token on your strategy card;
 * you are first in initiative order."
 *
 * A hint at the round: the plan keeps no initiative order, so there is nothing to count or to check.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:telepathic';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
