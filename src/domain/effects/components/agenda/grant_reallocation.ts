/**
 * Research Grant Reallocation (directive): "The elected player gains any 1 technology of their choice. Then, for each
 * prerequisite on that technology, they remove 1 token from their fleet pool and return it to their reinforcements."
 *
 * Decided: play. The elected player gains the technology entered among the agenda entry's gains (already counted), then
 * loses 1 fleet pool token per prerequisite of it, never below 0 (rulings), after which the fleet pool is checked
 * (37.3). Pass 1 keeps it a hint; the tests mark what the play must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:grant_reallocation';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
