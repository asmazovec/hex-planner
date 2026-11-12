/**
 * Swords to Plowshares (agenda):
 * "For: Each player destroys half of their infantry on each planet they control, rounded up. Then, each player
 * gains trade goods equal to the number of their infantry that were destroyed. Against: Each player places 1
 * infantry from their reinforcements on each planet they control."
 *
 * A directive (7.7, 7.8): it is resolved once and leaves nothing in play. Both outcomes change what the plan
 * counts, the infantry on the planets of each player and their trade goods, so it is to become a `play` of the agenda
 * entry that resolves it, with the outcome chosen there (`choices.outcome`). Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:plowshares';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
